import { ACTION_MAX_MS, ACTION_MIN_MS } from '@app/constants/constants';
import { Behavior, MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { VirtualPlayerScoreService } from '@app/services/virtual-player-score/virtualPlayerScore.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VirtualPlayerBehaviorService {
    constructor(
        private readonly gameCombatService: GameCombatService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
        private readonly virtualPlayerScoreService: VirtualPlayerScoreService,
    ) {}

    async executeBehavior(virtualPlayer: VirtualPlayer, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        const nextMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        const virtualPlayerTile = this.virtualPlayerScoreService.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        await this.executeNextMove(nextMove, virtualPlayerTile, lobby);
    }

    async tryToEscapeIfWounded(virtualPlayer: Player, accessCode: string): Promise<boolean> {
        const isInCombat = this.gameCombatService.isCombatActive(accessCode);
        if (!isInCombat) return false;
        const combatState = this.gameCombatService.getCombatState(accessCode);
        if (!combatState || combatState.currentFighter.name !== virtualPlayer.name) return false;
        const healthRatio = virtualPlayer.hp.current / virtualPlayer.hp.max;
        if (healthRatio < 1) {
            await new Promise((resolve) => setTimeout(resolve, this.virtualPlayerActions.getRandomDelay(ACTION_MIN_MS, ACTION_MAX_MS)));
            this.gameCombatService.attemptEscape(accessCode, virtualPlayer);
            return true;
        }
        return false;
    }

    private async executeNextMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<void> {
        switch (move.type) {
            case MoveType.Attack:
                console.log('att');
                await this.virtualPlayerActions.moveToAttack(move, virtualPlayerTile, lobby);
                break;
            case MoveType.Item:
                console.log('item');
                await this.virtualPlayerActions.pickUpItem(move, virtualPlayerTile, lobby);
                break;
        }
    }

    private getNextMove(moves: Move[], virtualPlayer: VirtualPlayer, lobby: Lobby): Move | undefined {
        if (moves.length === 0) return undefined;
        let scoredMoves: Move[];
        switch (virtualPlayer.behavior) {
            case Behavior.Aggressive:
                scoredMoves = this.virtualPlayerScoreService.scoreAggressiveMoves(moves, virtualPlayer, lobby);
                break;
            case Behavior.Defensive:
                scoredMoves = this.virtualPlayerScoreService.scoreDefensiveMoves(moves, virtualPlayer, lobby);
                break;
        }

        scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));

        const virtualPlayerTile = this.virtualPlayerScoreService.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        console.table(
            scoredMoves.map((move) => ({
                type: move.type,
                item: move.tile.item?.name ?? 'attack',
                score: move.score,
                inRange: move.inRange,
                distance: this.virtualPlayerActions.calculateTotalMovementCost(
                    this.virtualPlayerActions.getPathForMove(move, virtualPlayerTile, lobby) || [],
                ),
            })),
        );

        return scoredMoves[0];
    }
}
