import { VP_ACTION_WAIT_TIME_MS } from '@app/constants/constants';
import { EventEmit, ItemName, MoveType, TileType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
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
    ) {}

    async moveToAttack(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<void> {
        const movement = await this.executeMove(move, virtualPlayerTile, lobby);
        if (!movement) return;
        const destinationTile = movement.at(-1);
        const isAdjacentToPlayer = this.playerMovementService.getNeighbors(move.tile, lobby.game.grid).includes(destinationTile);
        if (isAdjacentToPlayer && virtualPlayerTile.player.actionPoints > 0) {
            await this.executeAction(lobby.accessCode, destinationTile, move.tile);
            return;
        }
        this.emitEvent(EventEmit.VPActionDone, lobby.accessCode);
    }

    async pickUpItem(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<void> {
        await this.executeMove(move, virtualPlayerTile, lobby);
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
        if (virtualPlayer.actionPoints === 0 && virtualPlayer.movementPoints === 0) {
            if (!hasIce) return false;
        } else if (virtualPlayer.actionPoints > 0 && virtualPlayer.movementPoints === 0) {
            if (!hasIce && !hasActionAvailable && (!hasLightning || !hasWall)) return false;
        } else if (virtualPlayer.movementPoints > 0 && virtualPlayer.actionPoints === 0) {
            if (this.playerMovementService.hasAdjacentPlayer(virtualPlayerTile, grid)) return false;
        }
        return true;
    }

    private async executeMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<Tile[]> {
        const movement = this.getMovement(move, virtualPlayerTile, lobby.game.grid);
        const payload = {
            virtualPlayerTile,
            closestReachableTile: move.tile,
            movement,
            accessCode: lobby.accessCode,
        };
        this.updateMovePoints(virtualPlayerTile.player, movement);
        this.emitEvent(VirtualPlayerEvents.VirtualPlayerMove, payload);
        return movement;
    }

    private updateActionPoints(virtualPlayer: Player): void {
        virtualPlayer.actionPoints -= 1; // put 1 in constant folder
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
            return this.playerMovementService.quickestPath(virtualPlayerTile, closestReachableTile, grid);
        }
    }

    private async executeAction(accessCode: string, currentTile: Tile, actionTile: Tile | undefined): Promise<void> {
        if (actionTile) {
            await new Promise((resolve) => setTimeout(resolve, VP_ACTION_WAIT_TIME_MS));
            this.gameCombatService.startCombat(accessCode, currentTile.player.name, actionTile.player.name);
            this.updateActionPoints(currentTile.player);
        }
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
