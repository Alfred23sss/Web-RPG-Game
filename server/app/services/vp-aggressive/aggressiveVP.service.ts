import { VP_ACTION_WAIT_TIME_MS } from '@app/constants/constants';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Lobby } from '@app/interfaces/Lobby';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { VPMoveType } from '@app/interfaces/VPMoveTypes';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { PlayerMovementService } from '@app/services/player-movement/playerMovement.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class AggressiveVPService {
    constructor(
        private readonly lobbyService: LobbyService,
        private readonly playerMovementService: PlayerMovementService,
        private readonly gridManagerService: GridManagerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly gameCombatService: GameCombatService,
    ) {}

    async executeAggressiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: VPMoveType, movesInRange: VPMoveType): Promise<void> {
        if (this.isMoveInRange(movesInRange)) {
            await this.getNextMoveType(movesInRange, lobby, virtualPlayer); // Add await
        } else {
            await this.getNextMoveType(possibleMoves, lobby, virtualPlayer); // Add await
        }
    }

    private async getNextMoveType(moves: VPMoveType, lobby: Lobby, virtualPlayer: Player): Promise<void> {
        if (moves.playerTiles) {
            await this.moveToNextAction(moves.playerTiles, lobby, virtualPlayer); // Add await
            return;
        }

        if (moves.itemTiles) {
            await this.moveToNextAction(moves.itemTiles, lobby, virtualPlayer); // Add await
            return;
        }
    }

    private isMoveInRange(movesInRange: VPMoveType): boolean {
        if (movesInRange.playerTiles.length > 0 || movesInRange.itemTiles.length > 0) return true;
        return false;
    }

    private async moveToNextAction(availableTiles: Tile[], lobby: Lobby, virtualPlayer: Player): Promise<Tile> {
        const virtualPlayerTile = this.gridManagerService.findTileByPlayer(lobby.game.grid, virtualPlayer);
        const closestReachableTile = this.playerMovementService.findClosestReachableTile(
            availableTiles,
            virtualPlayerTile,
            lobby.game.grid,
            virtualPlayer.movementPoints,
        );
        const movement = this.playerMovementService.quickestPath(virtualPlayerTile, closestReachableTile, lobby.game.grid);
        const payload = {
            virtualPlayerTile,
            closestReachableTile,
            movement,
            accessCode: lobby.accessCode,
        };

        this.emitEvent(VirtualPlayerEvents.VirtualPlayerMove, payload);

        // Wrap setTimeout in a Promise
        await new Promise((resolve) => setTimeout(resolve, VP_ACTION_WAIT_TIME_MS));
        await this.executeAction(lobby.accessCode, virtualPlayerTile, closestReachableTile);

        return closestReachableTile;
    }

    private async executeAction(accessCode: string, currentTile: Tile, actionTile: Tile | undefined): Promise<void> {
        if (actionTile) {
            // Wrap setTimeout in a Promise
            await new Promise((resolve) => setTimeout(resolve, VP_ACTION_WAIT_TIME_MS));
            await this.gameCombatService.startCombat(accessCode, currentTile.player.name, actionTile.player.name);
        }
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
