import { Behavior, EventEmit } from '@app/enums/enums';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { AggressiveVPService } from '@app/services/vp-aggressive/aggressiveVP.service';
import { DefensiveVPService } from '@app/services/vp-defensive/defensiveVP.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class VirtualPlayerService implements OnModuleInit {
    private virtualPlayer: VirtualPlayer;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly aggressiveVPService: AggressiveVPService,
        private readonly defensiveVPService: DefensiveVPService,
        private readonly lobbyService: LobbyService,
    ) {}

    onModuleInit() {
        this.eventEmitter.on(EventEmit.GameTurnStarted, ({ accessCode, player }) => {
            if (player.isVirtual) {
                this.virtualPlayer = player;
                const lobby = this.lobbyService.getLobby(accessCode);
                const grid = lobby.game.grid;
                const playerTiles = this.findPlayers(grid);
                if (this.virtualPlayer.behavior === Behavior.Aggressive) {
                    this.aggressiveVPService.executeAggressiveBehavior(playerTiles, this.virtualPlayer, lobby);
                } else if (this.virtualPlayer.behavior === Behavior.Defensive) {
                    console.log('defensive player');
                }
            }
        });
    }

    private findPlayers(grid: Tile[][]): Tile[] {
        return grid.flatMap((row) => row.filter((tile) => tile.player && tile.player.name !== this.virtualPlayer.name));
    }
}
