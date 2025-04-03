import { Behavior, EventEmit } from '@app/enums/enums';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { TileType } from '@app/model/database/tile';
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
                this.executeVirtualPlayerTurn(accessCode);
            }
        });
    }

    private async executeVirtualPlayerTurn(accessCode: string): Promise<void> {
        const lobby = this.lobbyService.getLobby(accessCode);

        while (this.hasRemainingActions()) {
            if (this.virtualPlayer.behavior === Behavior.Aggressive) {
                await this.aggressiveVPService.executeAggressiveBehavior(this.virtualPlayer, lobby);
            } else if (this.virtualPlayer.behavior === Behavior.Defensive) {
                // await this.defensiveVPService.executeDefensiveBehavior(playerTiles, this.virtualPlayer, lobby);
            }
        }

        // When all points are exhausted, end the turn
        // this.eventEmitter.emit(EventEmit.GameTurnEnded, { accessCode });
    }
// changer type de retour mettre un interface ou qqch ...
    private findAllMoves(virtualPlayer: Player, grid: Tile[][]): { playerTiles: Tile[]; itemTiles: Tile[]; doors: Tile[] } {
        const playerTiles = this.findPlayers(grid);
        const itemTiles = this.findItems(grid);
        const doors = this.findDoors(grid);

        return {
            playerTiles,
            itemTiles,
            doors,
        };
    }

    private findPlayers(grid: Tile[][]): Tile[] {
        return grid.flatMap((row) => row.filter((tile) => tile.player && tile.player.name !== this.virtualPlayer.name));
    }

    // tous les items incluant home ... faire attention. home utile seulement pour defensive en mode ctf
    private findItems(grid: Tile[][]): Tile[] {
        return grid.flatMap((row) => row.filter((tile) => tile.item));
    }

    private findDoors(grid: Tile[][]): Tile[] {
        return grid.flatMap((row) => row.filter((tile) => tile.type === TileType.Door));
    }

    private hasRemainingActions(): boolean {
        return this.virtualPlayer.actionPoints > 0 || this.virtualPlayer.movementPoints > 0;
    }
}
