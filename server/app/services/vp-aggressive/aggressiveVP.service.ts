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
        if (movesInRange) {
            this.getNextMoveType(movesInRange, lobby, virtualPlayer);
        } else {
            this.getNextMoveType(possibleMoves, lobby, virtualPlayer);
        }
        // filter moves only within move and action points!!!!
    }

    getNextMoveType(moves: VPMoveType, lobby: Lobby, virtualPlayer: Player): void {
        if (moves.playerTiles) this.moveToNextAction(moves.playerTiles, lobby, virtualPlayer);

        if (moves.itemTiles) this.moveToNextAction(moves.itemTiles, lobby, virtualPlayer); // item attaque a prioriser (cheker si juste un item en range et c pas att est ce quil le prend)

        // si aucun alors regarder les moves hors de range et aller vers le joueur le plus proche
    }

    private moveToNextAction(availableTiles: Tile[], lobby: Lobby, virtualPlayer: Player): Tile {
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

        return closestReachableTile;
    }

    private executeAction(accessCode: string, currentTile: Tile, actionTile: Tile | undefined): void {
        if (actionTile) {
            setTimeout(() => {
                this.gameCombatService.startCombat(accessCode, currentTile.player.name, actionTile.player.name);
            }, VP_ACTION_WAIT_TIME_MS);
        }
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
