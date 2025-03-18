import { CombatState } from '@app/interfaces/CombatState';
import { GameCombatMap } from '@app/interfaces/GameCombatMap';
import { Player } from '@app/interfaces/Player';
import { CombatHelperService } from '@app/services/combat-helper/combat-helper.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const COMBAT_TURN_DURATION = 5000;
const COMBAT_ESCAPE_LIMITED_DURATION = 3000;
const MAX_ESCAPE_ATTEMPTS = 2;
const SECOND = 1000;
const ESCAPE_THRESHOLD = 0.3;
const WIN_CONDITION = 3;

@Injectable()
export class GameCombatService {
    private combatStates: GameCombatMap = {};

    constructor(
        private readonly gameSessionService: GameSessionService,
        private readonly eventEmitter: EventEmitter2,
        private readonly combatHelper: CombatHelperService,
    ) {}

    handleCombatSessionAbandon(accessCode: string, playerName: string): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;
        if (combatState.attacker.name === playerName || combatState.defender.name === playerName) {
            const playerToUpdate = combatState.currentFighter.name === playerName ? combatState.currentFighter : combatState.defender;
            this.updateWinningPlayerAfterCombat(playerToUpdate, accessCode);
            this.emitEvent('update.player.list', { players: this.gameSessionService.getPlayers(accessCode), accessCode });
            this.endCombat(accessCode);
        }
    }

    endCombatTurn(accessCode: string): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;
        this.resetCombatTimers(accessCode);
        const nextFighter = this.getNextCombatFighter(accessCode);
        this.startCombatTurn(accessCode, nextFighter);
    }

    performAttack(accessCode: string, attackerName: string): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState || !this.combatHelper.isValidAttacker(combatState, attackerName)) return;
        this.resetCombatTimers(accessCode);
        combatState.playerPerformedAction = true;
        const { attackSuccessful, attackerScore, defenseScore, defenderPlayer } = this.calculateAttackResult(combatState, accessCode);
        this.emitEvent('game.combat.attack.result', {
            currentFighter: combatState.currentFighter,
            defenderPlayer,
            attackSuccessful,
            attackerScore,
            defenseScore,
        });
        if (attackSuccessful) {
            this.handleSuccessfulAttack(combatState, attackerScore, defenseScore, defenderPlayer, accessCode);
        } else {
            this.endCombatTurn(accessCode);
        }
    }

    attemptEscape(accessCode: string, player: Player): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;
        this.resetCombatTimers(accessCode);
        const { currentFighter, remainingEscapeAttempts, attacker, defender } = combatState;
        combatState.playerPerformedAction = true;
        if (currentFighter.name !== player.name) {
            return;
        }
        let attemptsLeft = remainingEscapeAttempts.get(player.name) || 0;
        attemptsLeft--;

        remainingEscapeAttempts.set(player.name, attemptsLeft);
        const isEscapeSuccessful = Math.random() < ESCAPE_THRESHOLD;
        this.emitEvent('game.combat.escape', { player, attemptsLeft, isEscapeSuccessful });
        if (isEscapeSuccessful) {
            this.resetHealth([attacker, defender], accessCode);
            combatState.hasEvaded = true;
            this.endCombat(accessCode, true);
        } else {
            this.endCombatTurn(accessCode);
        }
    }

    checkPlayerWon(accessCode: string, player: Player): boolean {
        if (player.combatWon === WIN_CONDITION) {
            this.gameSessionService.updateGameSessionPlayerList(accessCode, player.name, { combatWon: player.combatWon });
            this.emitEvent('update.player.list', { players: this.gameSessionService.getPlayers(accessCode), accessCode });
            this.gameSessionService.endGameSession(accessCode, player.name);
            return true;
        }
        return false;
    }

    endCombat(accessCode: string, isEscape: boolean = false): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;
        this.resetCombatTimers(accessCode);
        const { attacker, defender, currentFighter, pausedGameTurnTimeRemaining, hasEvaded } = combatState;
        this.emitEvent('game.combat.ended', { attacker, defender, currentFighter, hasEvaded });
        delete this.combatStates[accessCode];
        if (!this.gameSessionService.getGameSession(accessCode)) return;
        this.gameSessionService.setCombatState(accessCode, false);
        if (!isEscape && currentFighter && this.gameSessionService.isCurrentPlayer(accessCode, currentFighter.name)) {
            this.gameSessionService.resumeGameTurn(accessCode, pausedGameTurnTimeRemaining);
        } else if (!isEscape && currentFighter) {
            this.gameSessionService.endTurn(accessCode);
        } else {
            this.gameSessionService.resumeGameTurn(accessCode, pausedGameTurnTimeRemaining);
        }
    }

    isCombatActive(accessCode: string): boolean {
        return !!this.combatStates[accessCode];
    }

    getCombatState(accessCode: string): CombatState | null {
        return this.combatStates[accessCode] || null;
    }

    startCombat(accessCode: string, attackerId: string, defenderId: string, isDebugMode: boolean = false): void {
        const players = this.gameSessionService.getPlayers(accessCode);
        const attacker = players.find((p) => p.name === attackerId);
        const defender = players.find((p) => p.name === defenderId);
        if (!attacker || !defender) {
            return;
        }
        const pausedTimeRemaining = this.gameSessionService.pauseGameTurn(accessCode);
        this.initialiseCombatState(accessCode, attacker, defender, pausedTimeRemaining, isDebugMode);
        this.gameSessionService.setCombatState(accessCode, true);
        const orderedFighters = this.combatHelper.determineCombatOrder(attacker, defender);
        const currentPlayerName = orderedFighters[0].name;
        this.emitEvent('game.combat.started', { accessCode, attacker, defender, currentPlayerName });
        this.startCombatTurn(accessCode, orderedFighters[0]);
    }

    private initialiseCombatState(accessCode: string, attacker: Player, defender: Player, pausedTimeRemaining: number, isDebugMode: boolean) {
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
            playerPerformedAction: false,
            isDebugMode,
            hasEvaded: false,
        };
    }

    private updateWinningPlayerAfterCombat(player: Player, accessCode: string): void {
        player.hp.current = player.hp.max;
        player.combatWon++;
        if (this.checkPlayerWon(accessCode, player)) {
            this.gameSessionService.endGameSession(accessCode, player.name);
        }
        this.gameSessionService.updateGameSessionPlayerList(accessCode, player.name, player);
        this.emitEvent('update.player', { player });
        this.emitEvent('update.player.list', { players: this.gameSessionService.getPlayers(accessCode), accessCode });
    }

    private resetHealth(players: Player[], accessCode): void {
        players.forEach((player) => {
            player.hp.current = player.hp.max;
            this.emitEvent('update.player', { player });
            this.gameSessionService.updateGameSessionPlayerList(accessCode, player.name, player);
        });
    }

    private resetCombatTimers(accessCode: string) {
        const combatState = this.combatStates[accessCode];
        if (combatState.combatTurnTimers) {
            clearTimeout(combatState.combatTurnTimers);
            combatState.combatTurnTimers = null;
        }
        if (combatState.combatCountdownInterval) {
            clearInterval(combatState.combatCountdownInterval);
            combatState.combatCountdownInterval = null;
        }
    }

    private calculateAttackResult(combatState: CombatState, accessCode: string) {
        const { attacker, defender, currentFighter, isDebugMode } = combatState;
        const attackerScore = this.combatHelper.getRandomAttackScore(
            currentFighter,
            isDebugMode,
            this.gameSessionService.getGameSession(accessCode).game.grid,
        );
        const defenderPlayer = currentFighter === attacker ? defender : attacker;
        const defenseScore = this.combatHelper.getRandomDefenseScore(
            defenderPlayer,
            isDebugMode,
            this.gameSessionService.getGameSession(accessCode).game.grid,
        );
        return {
            attackSuccessful: attackerScore > defenseScore,
            attackerScore,
            defenseScore,
            defenderPlayer,
        };
    }

    private handleSuccessfulAttack(
        combatState: CombatState,
        attackerScore: number,
        defenseScore: number,
        defenderPlayer: Player,
        accessCode: string,
    ): void {
        const attackDamage = attackerScore - defenseScore;
        defenderPlayer.hp.current = Math.max(0, defenderPlayer.hp.current - attackDamage);
        this.emitEvent('update.player', { player: defenderPlayer });
        if (defenderPlayer.hp.current === 0) {
            this.handleCombatEnd(combatState, defenderPlayer, accessCode);
        } else {
            this.endCombatTurn(accessCode);
        }
    }

    private handleCombatEnd(combatState: CombatState, defenderPlayer: Player, accessCode: string): void {
        combatState.currentFighter.combatWon++;
        this.resetHealth([combatState.currentFighter, defenderPlayer], accessCode);
        const updatedGridAfterTeleportation = this.combatHelper.resetLoserPlayerPosition(
            defenderPlayer,
            this.gameSessionService.getGameSession(accessCode).game.grid,
        );
        this.endCombat(accessCode, false);
        this.gameSessionService.emitGridUpdate(accessCode, updatedGridAfterTeleportation);
        if (this.checkPlayerWon(accessCode, combatState.currentFighter)) {
            this.endCombat(accessCode);
            return;
        }
        this.emitEvent('update.player.list', { players: this.gameSessionService.getPlayers(accessCode), accessCode });
        if (combatState.attacker === defenderPlayer) {
            this.gameSessionService.endTurn(accessCode);
        }
    }

    private getNextCombatFighter(accessCode: string): Player {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;
        const { attacker, defender, currentFighter } = combatState;
        return currentFighter.name === attacker.name ? defender : attacker;
    }

    private startCombatTurn(accessCode: string, player: Player): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        combatState.playerPerformedAction = false;
        combatState.currentFighter = player;
        const defender = this.combatHelper.getDefender(combatState);
        const escapeAttemptsRemaining = combatState.remainingEscapeAttempts.get(player.name) || 0;
        const turnDuration = this.calculateTurnDuration(escapeAttemptsRemaining);
        const turnDurationInSeconds = turnDuration / SECOND;

        combatState.combatTurnTimeRemaining = turnDurationInSeconds;
        this.emitEvent('game.combat.turn.started', { accessCode, player: combatState.currentFighter, defender });

        if (combatState.combatCountdownInterval) {
            clearInterval(combatState.combatCountdownInterval);
            combatState.combatCountdownInterval = null;
        }

        this.initializeCombatTimer(accessCode, combatState, turnDurationInSeconds);
        this.handleTimerTimeout(accessCode, combatState, turnDuration);
    }

    private calculateTurnDuration(escapeAttemptsRemaining: number): number {
        return escapeAttemptsRemaining > 0 ? COMBAT_TURN_DURATION : COMBAT_ESCAPE_LIMITED_DURATION;
    }

    private initializeCombatTimer(accessCode: string, combatState: CombatState, turnDurationInSeconds: number): void {
        let timeLeft = turnDurationInSeconds;
        const defender = this.combatHelper.getDefender(combatState);
        this.emitEvent('game.combat.timer', { accessCode, attacker: combatState.currentFighter, defender, timeLeft });

        combatState.combatCountdownInterval = setInterval(() => {
            timeLeft--;
            combatState.combatTurnTimeRemaining = timeLeft;
            this.emitEvent('game.combat.timer', { accessCode, attacker: combatState.currentFighter, defender, timeLeft });

            if (timeLeft <= 0) {
                if (combatState.combatCountdownInterval) {
                    clearInterval(combatState.combatCountdownInterval);
                }
                combatState.combatCountdownInterval = null;
            }
        }, SECOND);
    }

    private handleTimerTimeout(accessCode: string, combatState: CombatState, turnDuration: number): void {
        combatState.combatTurnTimers = setTimeout(() => {
            if (!combatState.playerPerformedAction) {
                this.performAttack(accessCode, combatState.currentFighter.name);
            }
        }, turnDuration);
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
