import { VP_ACTION_WAIT_TIME_MS } from '@app/constants/constants';
import { MoveType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Tile } from '@app/interfaces/Tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { PlayerMovementService } from '@app/services/player-movement/playerMovement.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class VirtualPlayerActionsService {
    constructor(
        private readonly playerMovementService: PlayerMovementService,
        private readonly eventEmitter: EventEmitter2,
        private readonly gameCombatService: GameCombatService,
    ) {}

    moveToAttack(move: Move, virtualPlayerTile: Tile, lobby: Lobby): void {
        const movement = this.executeMove(move, virtualPlayerTile, lobby);
        if (!movement) return;
        const destinationTile = movement.at(-1);
        const isAdjacentToPlayer = this.playerMovementService.getNeighbors(move.tile, lobby.game.grid).includes(destinationTile);
        if (isAdjacentToPlayer) {
            this.executeAction(lobby.accessCode, destinationTile, move.tile);
        }
    }

    executeMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Tile[] {
        const movement = this.getMovement(move, virtualPlayerTile, lobby.game.grid);
        const payload = {
            virtualPlayerTile,
            closestReachableTile: move.tile,
            movement,
            accessCode: lobby.accessCode,
        };
        this.emitEvent(VirtualPlayerEvents.VirtualPlayerMove, payload);
        return movement;
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
        return path.slice(1).reduce((total, tile) => total + this.playerMovementService.getMoveCost(tile), 0);
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

    private executeAction(accessCode: string, currentTile: Tile, actionTile: Tile | undefined): void {
        if (actionTile) {
            new Promise((resolve) => setTimeout(resolve, VP_ACTION_WAIT_TIME_MS));
            this.gameCombatService.startCombat(accessCode, currentTile.player.name, actionTile.player.name);
        }
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
