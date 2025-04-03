import { VP_ACTION_WAIT_TIME_MS } from '@app/constants/constants';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Lobby } from '@app/interfaces/Lobby';
import { Tile } from '@app/interfaces/Tile';
import { Player } from '@app/model/database/player';
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
    ) {}

    executeAggressiveBehavior(playerTiles: Tile[], virtualPlayer: Player, lobby: Lobby): void {
        const newVPTile = this.executeMovement(playerTiles, virtualPlayer, lobby);
        // wait 2 seconds
        // chek pr action possible durant son parcours,
        // chek aussi pendant quil cherche le plus petit parcours de prendre en compte les portes et quil peut les ouvrir =>
        // (split move en 2 , premier move ensuite action si available ouvre porte et ensuite 2e move)
        setTimeout(() => {
            // do a action
        }, VP_ACTION_WAIT_TIME_MS);
    }

    private executeMovement(playerTiles: Tile[], virtualPlayer: Player, lobby: Lobby): Tile {
        const grid = lobby.game.grid;
        const virtualPlayerTile = this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
        const closestPlayerTile = this.playerMovementService.findClosestReachableTile(
            playerTiles,
            virtualPlayerTile,
            grid,
            virtualPlayer.movementPoints,
        );
        const movement = this.playerMovementService.quickestPath(virtualPlayerTile, closestPlayerTile, grid);
        const payload = {
            virtualPlayerTile,
            closestPlayerTile,
            movement,
            accessCode: lobby.accessCode,
        };
        this.emitEvent(VirtualPlayerEvents.VirtualPlayerMove, payload);

        return closestPlayerTile;
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
