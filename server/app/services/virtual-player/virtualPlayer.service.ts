import { Behavior, EventEmit, ItemName, MoveType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Move } from '@app/interfaces/Move';
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
                console.log(this.virtualPlayer.movementPoints);
                this.executeVirtualPlayerTurn(accessCode);
            }
        });
    }

    private executeVirtualPlayerTurn(accessCode: string): void {
        const lobby = this.lobbyService.getLobby(accessCode);

        if (this.virtualPlayer.movementPoints === 0 && this.virtualPlayer.actionPoints === 0) {
            this.eventEmitter.emit(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode });
            return;
        }
        const moves = this.findAllMoves(lobby.game.grid);
        switch (this.virtualPlayer.behavior) {
            case Behavior.Aggressive:
                this.aggressiveVPService.executeAggressiveBehavior(this.virtualPlayer, lobby, moves);
                break;
            case Behavior.Defensive:
                // await this.defensiveVPService.execute(this.virtualPlayer, lobby, possibleMoves, movesInRange);
                break;
        }
    }

    private findAllMoves(grid: Tile[][]): Move[] {
        const playerMoves = this.findPlayers(grid);
        const itemMoves = this.findItems(grid);

        return [...playerMoves, ...itemMoves];
    }

    private findPlayers(grid: Tile[][]): Move[] {
        return grid.flatMap((row) =>
            row
                .filter((tile) => tile.player && tile.player.name !== this.virtualPlayer.name)
                .map((tile) => ({
                    tile,
                    type: MoveType.Attack,
                    inRange: false,
                })),
        );
    }

    private findItems(grid: Tile[][]): Move[] {
        return grid.flatMap((row) =>
            row
                .filter((tile) => tile.item && tile.item.name !== ItemName.Home)
                .map((tile) => ({
                    tile,
                    type: MoveType.Item,
                    inRange: false,
                })),
        );
    }
}
