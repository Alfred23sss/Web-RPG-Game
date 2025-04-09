import {
    ACTION_COST,
    ACTION_MAX_MS,
    ACTION_MIN_MS,
    DESTINATION_POSITION,
    DOOR_ACTION_MAX_MS,
    DOOR_ACTION_MIN_MS,
    NO_SCORE,
    PLAYER_POSITION,
} from '@app/constants/constants';
import { EventEmit, ItemName, MoveType, TileType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameModeSelectorService } from '@app/services/game-mode-selector/game-mode-selector.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { PlayerMovementService } from '@app/services/player-movement/playerMovement.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class VirtualPlayerActionsService {
    constructor(
        private readonly playerMovementService: PlayerMovementService,
        private readonly eventEmitter: EventEmitter2,
        private readonly gameCombatService: GameCombatService,
        private readonly gridManagerService: GridManagerService,
        private readonly gameModeSelector: GameModeSelectorService,
    ) {}

    async moveToAttack(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<void> {
        const movement = await this.executeMove(move, virtualPlayerTile, lobby);
        if (!movement) return;
        const destinationTile = movement.at(DESTINATION_POSITION);
        const isAdjacentToClosedDoor = destinationTile.type === TileType.Door && !destinationTile.isOpen;
        const isAdjacentToPlayer = this.playerMovementService.getNeighbors(move.tile, lobby.game.grid).includes(destinationTile);
        if (isAdjacentToClosedDoor && virtualPlayerTile.player.actionPoints > NO_SCORE) {
            await this.openDoor(lobby.accessCode, movement.at(PLAYER_POSITION), destinationTile);
            return;
        }
        if (isAdjacentToPlayer && virtualPlayerTile.player.actionPoints > NO_SCORE) {
            await this.executeAttack(lobby.accessCode, destinationTile, move.tile);
            return;
        }

        this.emitEvent(EventEmit.VPActionDone, lobby.accessCode);
    }

    async pickUpItem(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<void> {
        const movement = await this.executeMove(move, virtualPlayerTile, lobby);
        if (!movement) return;
        const destinationTile = movement.at(DESTINATION_POSITION);
        const isAdjacentToClosedDoor = destinationTile.type === TileType.Door && !destinationTile.isOpen;
        if (isAdjacentToClosedDoor && virtualPlayerTile.player.actionPoints > NO_SCORE) {
            await this.openDoor(lobby.accessCode, movement.at(PLAYER_POSITION), destinationTile);
            return;
        }
        this.emitEvent(EventEmit.VPActionDone, lobby.accessCode);
    }

    getPathForMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Tile[] | undefined {
        if (move.type === MoveType.Attack && move.tile.player) {
            const adjacentTileToPlayer = this.playerMovementService.findBestMoveTile(move.tile, virtualPlayerTile, lobby.game.grid);
            if (adjacentTileToPlayer) {
                return this.playerMovementService.quickestPath(virtualPlayerTile, adjacentTileToPlayer, lobby.game.grid);
            }
        } else {
            return this.playerMovementService.quickestPath(virtualPlayerTile, move.tile, lobby.game.grid);
        }
    }

    calculateTotalMovementCost(path: Tile[]): number {
        if (!path) return;
        return path.slice(1).reduce((total, tile) => total + this.playerMovementService.getMoveCost(tile), 0);
    }

    checkAvailableActions(virtualPlayer: Player, lobby: Lobby): boolean {
        if (!lobby) return;
        const grid = lobby.game.grid;
        const virtualPlayerTile = this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
        const hasIce = this.playerMovementService.hasAdjacentTileType(virtualPlayerTile, grid, TileType.Ice);
        const hasWall = this.playerMovementService.hasAdjacentTileType(virtualPlayerTile, grid, TileType.Wall);
        const hasLightning = virtualPlayer.inventory.some((item) => item?.name === ItemName.Lightning);
        const hasActionAvailable = this.playerMovementService.hasAdjacentPlayerOrDoor(virtualPlayerTile, grid);
        if (virtualPlayer.actionPoints === NO_SCORE && virtualPlayer.movementPoints === NO_SCORE) {
            if (!hasIce) return false; // tester glace
        } else if (virtualPlayer.actionPoints > NO_SCORE && virtualPlayer.movementPoints === NO_SCORE) {
            if (!hasIce && !hasActionAvailable && (!hasLightning || !hasWall)) return false;
        }
        return true;
    }

    getRandomDelay(delayMinMS: number, delayLimitMS: number): number {
        return delayMinMS + Math.random() * (delayLimitMS - delayMinMS);
    }

    getMoveCost(tile: Tile): number {
        return this.playerMovementService.getMoveCost(tile);
    }

    private async executeMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<Tile[]> {
        const movement = this.getMovement(move, virtualPlayerTile, lobby.game.grid);
        if (!movement) return;
        let realMovement = movement;
        const lastTile = movement.at(-1);
        if (lastTile.type === TileType.Door && !lastTile.isOpen) {
            realMovement = movement.slice(0, -1);
        }
        if (realMovement.length <= 1 && virtualPlayerTile.player.actionPoints === 0) {
            console.log('ending virtual player turn');
            this.emitEvent(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode: lobby.accessCode });
            return;
        }

        this.move(virtualPlayerTile, move.tile, realMovement, lobby.accessCode);
        return movement;
    }

    private move(startTile: Tile, endTile: Tile, path: Tile[], accessCode: string): void {
        const payload = {
            virtualPlayerTile: startTile,
            closestReachableTile: endTile,
            movement: path,
            accessCode,
        };
        this.updateMovePoints(startTile.player, path);
        this.emitEvent(VirtualPlayerEvents.VirtualPlayerMove, payload);
    }

    private updateActionPoints(virtualPlayer: Player): void {
        virtualPlayer.actionPoints -= ACTION_COST;
    }

    private updateMovePoints(virtualPlayer: Player, movement: Tile[]): void {
        const moveCost = this.calculateTotalMovementCost(movement);
        virtualPlayer.movementPoints -= moveCost;
        return;
    }

    private getMovement(move: Move, virtualPlayerTile: Tile, grid: Tile[][]): Tile[] {
        let closestReachableTile: Tile;
        if (move.type === MoveType.Attack && move.tile.player) {
            const movePoints = virtualPlayerTile.player.movementPoints;
            closestReachableTile = this.playerMovementService.findClosestReachableTile(move.tile, virtualPlayerTile, grid, movePoints);
        } else {
            closestReachableTile = move.tile;
        }
        if (closestReachableTile) {
            const path = this.playerMovementService.quickestPath(virtualPlayerTile, closestReachableTile, grid);
            const trimmedPath = this.playerMovementService.trimPathAtObstacle(path);
            return trimmedPath;
        }
    }

    private async executeAttack(accessCode: string, currentTile: Tile, actionTile: Tile | undefined): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay(ACTION_MIN_MS, ACTION_MAX_MS)));
        if (!actionTile.player || !currentTile.player) {
            this.emitEvent(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode });
            return;
        }
        this.gameCombatService.startCombat(accessCode, currentTile.player.name, actionTile.player.name);
        this.updateActionPoints(currentTile.player);
    }

    private async openDoor(accessCode: string, currentTile: Tile, actionTile: Tile | undefined): Promise<void> {
        if (!actionTile) {
            this.emitEvent(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode });
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay(DOOR_ACTION_MIN_MS, DOOR_ACTION_MAX_MS)));
        const gameService = this.gameModeSelector.getServiceByAccessCode(accessCode);
        gameService.updateDoorTile(accessCode, currentTile, actionTile);
        this.updateActionPoints(currentTile.player);
        this.emitEvent(EventEmit.VPActionDone, accessCode);
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
