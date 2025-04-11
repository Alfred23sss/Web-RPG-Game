import { ACTION_MAX_MS, ACTION_MIN_MS, AGGRESSIVE_ITEM_ORDER, DEFENSIVE_ITEM_ORDER } from '@app/constants/constants';
import { Behavior, MoveType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Item } from '@app/interfaces/Item';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerBehaviorService } from '@app/services/virtual-player-behavior/virtualPlayerBehavior.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class VirtualPlayerService {
    private virtualPlayer: VirtualPlayer;
    private movementPoints: number;
    private actionsPoints: number;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly virtualPlayerBehavior: VirtualPlayerBehaviorService,
        private readonly lobbyService: LobbyService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}

    resetStats(): void {
        this.virtualPlayer.movementPoints = this.movementPoints;
        this.virtualPlayer.actionPoints = this.actionsPoints;
    }

    itemChoice(behavior: Behavior, items: Item[]): Item {
        if (behavior === Behavior.Null) return;
        const itemChoiceOrder = behavior === Behavior.Aggressive ? AGGRESSIVE_ITEM_ORDER : DEFENSIVE_ITEM_ORDER;
        const result: Item[] = [];

        for (const name of itemChoiceOrder) {
            const found = items.find((item) => item.name === name);
            if (found && !result.includes(found)) {
                result.push(found);
                if (result.length === 2) break;
            }
        }
        const removed = items.find((item) => !result.includes(item));
        return removed || null;
    }

    handleTurnStart(accessCode: string, vPlayer: VirtualPlayer): void {
        if (vPlayer.isVirtual) {
            this.virtualPlayer = vPlayer;
            this.movementPoints = this.virtualPlayer.movementPoints;
            this.actionsPoints = this.virtualPlayer.actionPoints;
            this.delay(accessCode);
        }
    }

    async handleCombatTurnStart(accessCode: string, vPlayer: VirtualPlayer): Promise<void> {
        if (vPlayer.isVirtual && vPlayer.behavior === Behavior.Defensive) {
            this.virtualPlayer = vPlayer;
            const hasEscaped = await this.virtualPlayerBehavior.tryToEscapeIfWounded(vPlayer, accessCode);
            if (hasEscaped) return;
        }
    }

    delay(accessCode: string): void {
        const randomDelay = this.virtualPlayerActions.getRandomDelay(ACTION_MIN_MS, ACTION_MAX_MS);
        setTimeout(() => this.executeVirtualPlayerTurn(accessCode), randomDelay);
    }

    private executeVirtualPlayerTurn(accessCode: string): void {
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) return;

        if (!this.hasAvailableActions(accessCode, this.virtualPlayer, lobby)) return;

        const moves = this.findAllMoves(lobby.game.grid);
        this.virtualPlayerBehavior.executeBehavior(this.virtualPlayer, lobby, moves);
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
                .filter((tile) => tile.item)
                .map((tile) => ({
                    tile,
                    type: MoveType.Item,
                    inRange: false,
                })),
        );
    }
}
