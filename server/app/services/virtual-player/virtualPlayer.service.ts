import { VP_TURN_DONE_MS } from '@app/constants/constants';
import { Behavior, EventEmit, ItemName, MoveType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { AggressiveVPService } from '@app/services/vp-aggressive/aggressiveVP.service';
import { DefensiveVPService } from '@app/services/vp-defensive/defensiveVP.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class VirtualPlayerService implements OnModuleInit {
    private virtualPlayer: VirtualPlayer;
    private movementPoints: number;
    private actionsPoints: number;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly aggressiveVPService: AggressiveVPService,
        private readonly defensiveVPService: DefensiveVPService,
        private readonly lobbyService: LobbyService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}

    onModuleInit() {
        this.eventEmitter.on(EventEmit.GameTurnStarted, ({ accessCode, player }) => {
            if (player.isVirtual) {
                this.virtualPlayer = player;
                this.movementPoints = this.virtualPlayer.movementPoints;
                this.actionsPoints = this.virtualPlayer.actionPoints;
                this.executeVirtualPlayerTurn(accessCode);
            }
        });
        this.eventEmitter.on(EventEmit.GameCombatTurnStarted, async ({ accessCode, player }) => {
            if (player.isVirtual && player.behavior === Behavior.Defensive) {
                this.virtualPlayer = player;
                const hasEscaped = await this.defensiveVPService.tryToEscapeIfWounded(player, accessCode);
                if (hasEscaped) return;
            }
        }); 
        this.eventEmitter.on(EventEmit.VPActionDone, (accessCode) => {
            setTimeout(() => this.executeVirtualPlayerTurn(accessCode), VP_TURN_DONE_MS);
            console.log('starting another turn behavior');
        });
    }

    resetStats(): void {
        this.virtualPlayer.movementPoints = this.movementPoints;
        this.virtualPlayer.actionPoints = this.actionsPoints;
    }

    private executeVirtualPlayerTurn(accessCode: string): void {
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) return;

        console.log(this.virtualPlayer.movementPoints, 'actionpoints', this.virtualPlayer.actionPoints);
        if (!this.hasAvailableActions(accessCode, this.virtualPlayer, lobby)) return;

        const moves = this.findAllMoves(lobby.game.grid);
        switch (this.virtualPlayer.behavior) {
            case Behavior.Aggressive:
                this.aggressiveVPService.executeAggressiveBehavior(this.virtualPlayer, lobby, moves);
                break;
            case Behavior.Defensive:
                this.defensiveVPService.executeDefensiveBehavior(this.virtualPlayer, lobby, moves);
                break;
        }
    }

    private hasAvailableActions(accessCode: string, virtualPlayer: Player, lobby: Lobby): boolean {
        if (!this.virtualPlayerActions.checkAvailableActions(virtualPlayer, lobby)) {
            this.eventEmitter.emit(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode });
            return false;
        }
        return true;
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
