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
import { EventEmit, MoveType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtual-player.gateway.events';
import { Lobby } from '@app/interfaces/lobby';
import { Move } from '@app/interfaces/move';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { ItemName, TeamType, TileType } from '@common/enums';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class VirtualPlayerActionsService {
    constructor(
        private readonly playerMovementService: PlayerMovementService,
        private readonly eventEmitter: EventEmitter2,
        private readonly gameCombatService: GameCombatService,
        private readonly gridManagerService: GridManagerService,
        private readonly gameSessionService: GameSessionService,
    ) {}

    async moveToAttack(move: Move, virtualPlayerTile: Tile, lobby: Lobby, virtualPlayer: VirtualPlayer): Promise<void> {
        const movement = await this.executeMove(move, virtualPlayerTile, lobby);
        if (!movement) return;
        const destinationTile = movement.at(DESTINATION_POSITION);
        const openedDoor = await this.handleAdjacentToClosedDoor(destinationTile, virtualPlayerTile, movement, lobby.accessCode, virtualPlayer);
        if (openedDoor) return;
        const attacked = await this.handleAdjacentToPlayer(destinationTile, virtualPlayerTile, move, lobby);
        if (attacked) return;
        this.emitEvent(EventEmit.VPActionDone, lobby.accessCode);
    }

    async pickUpItem(move: Move, virtualPlayerTile: Tile, lobby: Lobby, virtualPlayer: VirtualPlayer): Promise<void> {
        const movement = await this.executeMove(move, virtualPlayerTile, lobby);
        if (!movement) return;
        const destinationTile = movement.at(DESTINATION_POSITION);
        const openedDoor = await this.handleAdjacentToClosedDoor(destinationTile, virtualPlayerTile, movement, lobby.accessCode, virtualPlayer);
        if (openedDoor) return;
        this.emitEvent(EventEmit.VPActionDone, lobby.accessCode);
    }

    getPathForMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Tile[] | undefined {
        const grid = lobby.game.grid;
        const isMoveAttack = move.type === MoveType.Attack && move.tile.player;
        const playerOnMove = !!move.tile.player && move.tile.player.name !== virtualPlayerTile.player.name && move.type !== MoveType.Attack;
        let targetTile = move.tile;
        if (isMoveAttack || playerOnMove) {
            targetTile = this.playerMovementService.findBestMoveTile(move.tile, virtualPlayerTile, grid);
        }

        return targetTile ? this.playerMovementService.quickestPath(virtualPlayerTile, targetTile, lobby.game.grid) : undefined;
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
        const hasPickaxe = virtualPlayer.inventory.some((item) => item?.name === ItemName.Pickaxe);
        const hasActionAvailable = this.playerMovementService.hasAdjacentPlayerOrDoor(virtualPlayerTile, grid);
        if (virtualPlayer.actionPoints === NO_SCORE && virtualPlayer.movementPoints === NO_SCORE) {
            return hasIce;
        } else if (virtualPlayer.actionPoints > NO_SCORE && virtualPlayer.movementPoints === NO_SCORE) {
            return hasIce || hasActionAvailable || (hasPickaxe && hasWall);
        }
        return true;
    }

    getRandomDelay(delayMinMS: number, delayLimitMS: number): number {
        return delayMinMS + Math.random() * (delayLimitMS - delayMinMS);
    }

    getMoveCost(tile: Tile): number {
        return this.playerMovementService.getMoveCost(tile);
    }

    areOnSameTeam(teamA: TeamType, teamB: TeamType) {
        return teamA !== undefined && teamB !== undefined && teamA === teamB;
    }

    isFlagInInventory(player: Player): boolean {
        if (!player || !player.inventory) return false;
        return player.inventory.some((item) => item && item.name === ItemName.Flag);
    }

    private async handleAdjacentToClosedDoor(
        destinationTile: Tile,
        virtualPlayerTile: Tile,
        movement: Tile[],
        accessCode: string,
        virtualPlayer: VirtualPlayer,
    ): Promise<boolean> {
        const isAdjacentToClosedDoor = destinationTile.type === TileType.Door && !destinationTile.isOpen;
        if (isAdjacentToClosedDoor && virtualPlayerTile.player.actionPoints > NO_SCORE) {
            await this.openDoor(accessCode, movement.at(PLAYER_POSITION), destinationTile, virtualPlayer);
            return true;
        }
        return false;
    }

    private async handleAdjacentToPlayer(destinationTile: Tile, virtualPlayerTile: Tile, move: Move, lobby: Lobby): Promise<boolean> {
        const isAdjacentToPlayer = this.playerMovementService.getNeighbors(move.tile, lobby.game.grid).includes(destinationTile);
        if (isAdjacentToPlayer && virtualPlayerTile.player.actionPoints > NO_SCORE) {
            await this.executeAttack(lobby.accessCode, destinationTile, move.tile);
            return true;
        }
        return false;
    }

    private async executeMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<Tile[]> {
        const movement = this.getMovement(move, virtualPlayerTile, lobby.game.grid);
        if (!movement) return;
        const realMovement = this.adjustMovementForDoor(movement);
        const isMoveStayInPlace = movement.length <= 1 && move.type === MoveType.Item;
        const isDoorBlockingMove = realMovement.length <= 1 && virtualPlayerTile.player.actionPoints === NO_SCORE;
        if (isDoorBlockingMove || isMoveStayInPlace) {
            this.emitEvent(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode: lobby.accessCode });
            return;
        }

        this.move(virtualPlayerTile, move.tile, realMovement, lobby.accessCode);
        return movement;
    }

    private adjustMovementForDoor(movement: Tile[]): Tile[] {
        const lastTile = movement.at(DESTINATION_POSITION);
        return lastTile.type === TileType.Door && !lastTile.isOpen ? movement.slice(0, DESTINATION_POSITION) : movement;
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
        const movePoints = virtualPlayerTile.player.movementPoints;
        const isAttackMove = move.type === MoveType.Attack && move.tile.player;
        const isPlayerOnMove = !!move.tile.player && move.tile.player.name !== virtualPlayerTile.player.name && move.type !== MoveType.Attack;
        if (isAttackMove || isPlayerOnMove) {
            closestReachableTile = this.playerMovementService.findClosestReachableTile(move.tile, virtualPlayerTile, grid, movePoints);
        } else {
            closestReachableTile = this.playerMovementService.getFarthestReachableTile(virtualPlayerTile, move.tile, grid, movePoints);
        }
        if (closestReachableTile) {
            const path = this.playerMovementService.quickestPath(virtualPlayerTile, closestReachableTile, grid);
            const trimmedPath = this.playerMovementService.trimPathAtObstacle(path);
            return trimmedPath;
        }
        return [virtualPlayerTile];
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

    private async openDoor(accessCode: string, currentTile: Tile, actionTile: Tile | undefined, virtualPlayer: VirtualPlayer): Promise<void> {
        if (!actionTile) {
            this.emitEvent(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode });
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, this.getRandomDelay(DOOR_ACTION_MIN_MS, DOOR_ACTION_MAX_MS)));
        this.gameSessionService.updateDoorTile(accessCode, currentTile, actionTile, virtualPlayer);
        this.updateActionPoints(virtualPlayer);
        this.emitEvent(EventEmit.VPActionDone, accessCode);
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
