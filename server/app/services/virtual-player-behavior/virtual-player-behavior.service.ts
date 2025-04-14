import { ACTION_MAX_MS, ACTION_MIN_MS } from '@app/constants/constants';
import { MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/lobby';
import { Move } from '@app/interfaces/move';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtual-player-actions/virtual-player-actions.service';
import { VirtualPlayerScoreService } from '@app/services/virtual-player-score/virtual-player-score.service';
import { Injectable } from '@nestjs/common';
import { Behavior } from '@common/enums';

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
        await this.executeNextMove(nextMove, virtualPlayerTile, lobby, virtualPlayer);
    }

    async tryToEscapeIfWounded(virtualPlayer: Player, accessCode: string): Promise<boolean> {
        const isInCombat = this.gameCombatService.isCombatActive(accessCode);
        if (!isInCombat) return false;
        const combatState = this.gameCombatService.getCombatState(accessCode);
        if (!combatState || combatState.currentFighter.name !== virtualPlayer.name) return false;
        const healthRatio = virtualPlayer.hp.current / virtualPlayer.hp.max;
        if (healthRatio < 1) {
            await new Promise((resolve) => setTimeout(resolve, this.virtualPlayerActions.getRandomDelay(ACTION_MIN_MS, ACTION_MAX_MS)));
            if (combatState.remainingEscapeAttempts.get(virtualPlayer.name) > 0) {
                this.gameCombatService.attemptEscape(accessCode, virtualPlayer);
            } else {
                this.gameCombatService.performAttack(accessCode, virtualPlayer.name);
            }

            return true;
        }
        return false;
    }

    async attack(virtualPlayer: Player, accessCode: string): Promise<void> {
        const isInCombat = this.gameCombatService.isCombatActive(accessCode);
        if (!isInCombat) return;
        const combatState = this.gameCombatService.getCombatState(accessCode);
        if (!combatState || combatState.currentFighter.name !== virtualPlayer.name) return;
        await new Promise((resolve) => setTimeout(resolve, this.virtualPlayerActions.getRandomDelay(ACTION_MIN_MS, ACTION_MAX_MS)));
        this.gameCombatService.performAttack(accessCode, virtualPlayer.name);
    }

    private async executeNextMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby, virtualPlayer: VirtualPlayer): Promise<void> {
        switch (move.type) {
            case MoveType.Attack:
                await this.virtualPlayerActions.moveToAttack(move, virtualPlayerTile, lobby, virtualPlayer);
                break;
            case MoveType.Item:
                await this.virtualPlayerActions.pickUpItem(move, virtualPlayerTile, lobby, virtualPlayer);
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
        return scoredMoves[0];
    }
}
