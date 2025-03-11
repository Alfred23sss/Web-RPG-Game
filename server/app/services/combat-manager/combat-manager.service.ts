import { CombatState } from '@app/interfaces/CombatState';
import { GameCombatMap } from '@app/interfaces/GameCombatMap';
import { Player } from '@app/interfaces/Player';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const COMBAT_TURN_DURATION = 5000;
const COMBAT_ESCAPE_LIMITED_DURATION = 3000;
const MAX_ESCAPE_ATTEMPTS = 2;
const SECOND = 1000;
const DICE_RANDOMIZER = 6;
const ESCAPE_TRESHOLD = 0.5;

@Injectable()
export class GameManagerService {
    private combatStates: GameCombatMap = {};

    constructor(
        private readonly gameSessionService: GameSessionService,
        private readonly eventEmitter: EventEmitter2,
        private readonly logger: Logger,
    ) {}

    endCombatTurn(accessCode: string, isTimeout: boolean = false): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        if (combatState.combatTurnTimers) {
            clearTimeout(combatState.combatTurnTimers);
            combatState.combatTurnTimers = null;
        }

        if (combatState.combatCountdownInterval) {
            clearInterval(combatState.combatCountdownInterval);
            combatState.combatCountdownInterval = null;
        }

        const currentFighter = combatState.currentFighter;
        const nextFighter = this.getNextCombatFighter(accessCode);

        if (isTimeout) {
            this.emitCombatTimeoutAction(accessCode, currentFighter);
        }

        this.startCombatTurn(accessCode, nextFighter);
    }

    performAttack(accessCode: string, attackerName: string): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        const { attacker, defender, currentFighter } = combatState;

        if (currentFighter.name !== attackerName) {
            this.logger.warn(`Not ${attackerName}'s turn in combat`);
            return;
        }

        const attackerScore = currentFighter.attack.value + Math.floor(Math.random() * DICE_RANDOMIZER) + 1;
        const defenderPlayer = currentFighter === attacker ? defender : attacker;
        const defenseScore = defenderPlayer.defense.value + Math.floor(Math.random() * DICE_RANDOMIZER) + 1;
        const attackSuccessful = attackerScore > defenseScore;

        this.emitCombatAttackResult(accessCode, currentFighter, attackSuccessful, attackerScore, defenseScore);

        if (attackSuccessful) {
            combatState.winner = currentFighter;
            this.endCombat(accessCode);
        } else {
            this.endCombatTurn(accessCode);
        }
    }

    attemptEscape(accessCode: string, playerName: string): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        const { currentFighter, remainingEscapeAttempts } = combatState;

        if (currentFighter.name !== playerName) {
            this.logger.warn(`Not ${playerName}'s turn in combat`);
            return;
        }

        const attemptsLeft = remainingEscapeAttempts.get(playerName) || 0;
        if (attemptsLeft <= 0) {
            this.emitCombatEscapeAttemptFailed(accessCode, currentFighter, false);
            return;
        }

        remainingEscapeAttempts.set(playerName, attemptsLeft - 1);

        const escapeSuccessful = Math.random() > ESCAPE_TRESHOLD;

        this.emitCombatEscapeAttemptResult(accessCode, currentFighter, escapeSuccessful, attemptsLeft - 1);

        if (escapeSuccessful) {
            this.endCombat(accessCode, true);
        } else {
            this.endCombatTurn(accessCode);
        }
    }

    endCombat(accessCode: string, isEscape: boolean = false): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        if (combatState.combatTurnTimers) {
            clearTimeout(combatState.combatTurnTimers);
            combatState.combatTurnTimers = null;
        }

        if (combatState.combatCountdownInterval) {
            clearInterval(combatState.combatCountdownInterval);
            combatState.combatCountdownInterval = null;
        }

        const { attacker, defender, winner, pausedGameTurnTimeRemaining } = combatState;

        this.emitCombatEnded(accessCode, attacker, defender, winner, isEscape);

        this.gameSessionService.setCombatState(accessCode, false);

        if (!isEscape && winner && this.gameSessionService.isCurrentPlayer(accessCode, winner.name)) {
            this.gameSessionService.resumeGameTurn(accessCode, pausedGameTurnTimeRemaining);
        } else if (!isEscape && winner) {
            this.gameSessionService.endTurn(accessCode);
        } else {
            this.gameSessionService.resumeGameTurn(accessCode, pausedGameTurnTimeRemaining);
        }

        delete this.combatStates[accessCode];
    }

    isCombatActive(accessCode: string): boolean {
        return !!this.combatStates[accessCode];
    }

    getCombatState(accessCode: string): CombatState | null {
        return this.combatStates[accessCode] || null;
    }

    startCombat(accessCode: string, attackerId: string, defenderId: string): void {
        const players = this.gameSessionService.getPlayers(accessCode);
        const attacker = players.find((p) => p.name === attackerId);
        const defender = players.find((p) => p.name === defenderId);

        if (!attacker || !defender) {
            this.logger.warn(`Cannot start combat: players not found for accessCode ${accessCode}`);
            return;
        }

        const pausedTimeRemaining = this.gameSessionService.pauseGameTurn(accessCode);

        this.combatStates[accessCode] = {
            attacker,
            defender,
            currentFighter: null,
            remainingEscapeAttempts: new Map([
                [attacker.name, MAX_ESCAPE_ATTEMPTS],
                [defender.name, MAX_ESCAPE_ATTEMPTS],
            ]),
            combatTurnTimers: null,
            combatCountdownInterval: null,
            combatTurnTimeRemaining: 0,
            pausedGameTurnTimeRemaining: pausedTimeRemaining,
        };

        this.gameSessionService.setCombatState(accessCode, true);

        const orderedFighters = this.determineCombatOrder(attacker, defender);

        this.emitCombatStarted(accessCode, attacker, defender, orderedFighters[0]);

        this.startCombatTurn(accessCode, orderedFighters[0]);
    }

    private determineCombatOrder(attacker: Player, defender: Player): Player[] {
        if (attacker.speed === defender.speed) {
            return [attacker, defender];
        }

        return attacker.speed > defender.speed ? [attacker, defender] : [defender, attacker];
    }

    private getNextCombatFighter(accessCode: string): Player {
        const combatState = this.combatStates[accessCode];
        if (!combatState) throw new Error('Combat state not found');

        const { attacker, defender, currentFighter } = combatState;

        return currentFighter.name === attacker.name ? defender : attacker;
    }

    private startCombatTurn(accessCode: string, player: Player): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        combatState.currentFighter = player;

        const escapeAttemptsRemaining = combatState.remainingEscapeAttempts.get(player.name) || 0;
        const turnDuration = escapeAttemptsRemaining > 0 ? COMBAT_TURN_DURATION : COMBAT_ESCAPE_LIMITED_DURATION;
        const turnDurationInSeconds = turnDuration / SECOND;

        combatState.combatTurnTimeRemaining = turnDurationInSeconds;

        this.emitCombatTurnStarted(accessCode, player, turnDurationInSeconds, escapeAttemptsRemaining);

        if (combatState.combatCountdownInterval) {
            clearInterval(combatState.combatCountdownInterval);
            combatState.combatCountdownInterval = null;
        }

        let timeLeft = turnDurationInSeconds;
        combatState.combatCountdownInterval = setInterval(() => {
            timeLeft--;
            combatState.combatTurnTimeRemaining = timeLeft;

            this.emitCombatTimerUpdate(accessCode, timeLeft);

            if (timeLeft <= 0) {
                if (combatState.combatCountdownInterval) {
                    clearInterval(combatState.combatCountdownInterval);
                }
                combatState.combatCountdownInterval = null;
            }
        }, SECOND);

        combatState.combatTurnTimers = setTimeout(() => {
            this.endCombatTurn(accessCode, true);
        }, turnDuration);
    }

    private emitCombatStarted(accessCode: string, attacker: Player, defender: Player, firstFighter: Player): void {
        this.eventEmitter.emit('game.combat.started', { accessCode, attacker, defender, firstFighter });
    }

    private emitCombatTurnStarted(accessCode: string, fighter: Player, duration: number, escapeAttemptsLeft: number): void {
        this.eventEmitter.emit('game.combat.turn.started', {
            accessCode,
            fighter,
            duration,
            escapeAttemptsLeft,
        });
    }

    private emitCombatTimerUpdate(accessCode: string, timeLeft: number): void {
        this.eventEmitter.emit('game.combat.timer', { accessCode, timeLeft });
    }

    private emitCombatTimeoutAction(accessCode: string, fighter: Player): void {
        this.eventEmitter.emit('game.combat.timeout', { accessCode, fighter });
    }

    private emitCombatAttackResult(accessCode: string, attacker: Player, success: boolean, attackScore: number, defenseScore: number): void {
        this.eventEmitter.emit('game.combat.attack.result', {
            accessCode,
            attacker,
            success,
            attackScore,
            defenseScore,
        });
    }

    private emitCombatEscapeAttemptResult(accessCode: string, player: Player, success: boolean, attemptsLeft: number): void {
        this.eventEmitter.emit('game.combat.escape.result', {
            accessCode,
            player,
            success,
            attemptsLeft,
        });
    }

    private emitCombatEscapeAttemptFailed(accessCode: string, player: Player, hasAttempts: boolean): void {
        this.eventEmitter.emit('game.combat.escape.failed', {
            accessCode,
            player,
            hasAttempts,
        });
    }

    private emitCombatEnded(accessCode: string, attacker: Player, defender: Player, winner: Player, isEscape: boolean): void {
        this.eventEmitter.emit('game.combat.ended', {
            accessCode,
            attacker,
            defender,
            winner,
            isEscape,
        });
    }
}
