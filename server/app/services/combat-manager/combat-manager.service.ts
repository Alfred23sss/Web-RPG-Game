import { CombatState } from '@app/interfaces/CombatState';
import { DiceType } from '@app/interfaces/Dice';
import { GameCombatMap } from '@app/interfaces/GameCombatMap';
import { Player } from '@app/interfaces/Player';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { Tile } from '@app/interfaces/Tile';

const COMBAT_TURN_DURATION = 5000;
const COMBAT_ESCAPE_LIMITED_DURATION = 3000;
const MAX_ESCAPE_ATTEMPTS = 2;
const SECOND = 1000;
const ESCAPE_THRESHOLD = 0.5;

@Injectable()
export class GameCombatService {
    private combatStates: GameCombatMap = {};

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly gameSessionService: GameSessionService,
        private readonly eventEmitter: EventEmitter2,
        private readonly logger: Logger,
        private readonly gridManagerService: GridManagerService,
    ) {}

    handleCombatSessionAbandon(accessCode: string, playerName: string): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        if (combatState.currentFighter.name === playerName || combatState.defender.name === playerName) {
            const playerToUpdate = combatState.currentFighter.name === playerName ? combatState.currentFighter : combatState.defender;
            this.updateWinningPlayerAfterCombat(playerToUpdate, accessCode);

            this.endCombat(accessCode);
        }
    }

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
        combatState.playerPerformedAction = true;

        if (currentFighter.name !== attackerName) {
            this.logger.warn(`Not ${attackerName}'s turn in combat`);
            return;
        }

        const attackerScore = currentFighter.attack.value + Math.floor(Math.random() * this.extractDiceValue(currentFighter.attack.bonusDice)) + 1;
        const defenderPlayer = currentFighter === attacker ? defender : attacker;
        const defenseScore = defenderPlayer.defense.value + Math.floor(Math.random() * this.extractDiceValue(defenderPlayer.defense.bonusDice)) + 1;
        const attackSuccessful = attackerScore > defenseScore;

        this.emitCombatAttackResult(
            this.lobbyService.getPlayerSocket(currentFighter.name),
            this.lobbyService.getPlayerSocket(defenderPlayer.name),
            attackSuccessful,
            attackerScore,
            defenseScore,
        );

        if (attackSuccessful) {
            const attackDamage = attackerScore - defenseScore;
            defenderPlayer.hp.current -= attackDamage;
            this.logger.log(`${currentFighter.name} attacked ${defenderPlayer.name} for ${attackDamage} damage`);
            this.logger.log(`${defenderPlayer.name} has ${defenderPlayer.hp.current} hp left, combat will stop if under 0`);
            if (defenderPlayer.hp.current <= 0) {
                defenderPlayer.hp.current = defenderPlayer.hp.max; // reset point de vie du joeur qui defend
                currentFighter.hp.current = currentFighter.hp.max; // reset point de vie du joueur qui attaque
                currentFighter.combatWon++;
                // teleporte le defenderPlayer a son spawn point
                const defenderSpawnPoint = this.gridManagerService.findTileBySpawnPoint(
                    this.gameSessionService.getGameSession(accessCode).game.grid,
                    defenderPlayer,
                );
                const updatedGridAfterTeleportation = this.gridManagerService.teleportPlayer(
                    this.gameSessionService.getGameSession(accessCode).game.grid,
                    defenderPlayer,
                    defenderSpawnPoint,
                );
                this.gameSessionService.updateGameSessionPlayerList(accessCode, defenderPlayer.name, defenderPlayer); //
                this.gameSessionService.updateGameSessionPlayerList(accessCode, currentFighter.name, currentFighter);
                this.endCombat(accessCode, false, updatedGridAfterTeleportation);
            }
        } else {
            this.logger.log(`attack was not successful for ${currentFighter.name}`);
        }
    }

    attemptEscape(accessCode: string, playerName: string): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        const { currentFighter, remainingEscapeAttempts } = combatState;
        combatState.playerPerformedAction = true;
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

        const escapeSuccessful = Math.random() > ESCAPE_THRESHOLD;

        this.emitCombatEscapeAttemptResult(accessCode, currentFighter, escapeSuccessful, attemptsLeft - 1);

        if (escapeSuccessful) {
            this.endCombat(accessCode, true);
        } else {
            this.endCombatTurn(accessCode);
        }
    }

    endCombat(accessCode: string, isEscape: boolean = false, grid: Tile[][] = undefined): void {
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

        this.emitCombatEnded(accessCode, attacker, defender, winner, isEscape, grid);

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
            playerPerformedAction: false,
        };

        this.gameSessionService.setCombatState(accessCode, true);

        const orderedFighters = this.determineCombatOrder(attacker, defender);

        this.emitCombatStarted(
            accessCode,
            this.lobbyService.getPlayerSocket(attackerId),
            this.lobbyService.getPlayerSocket(defenderId),
            orderedFighters[0].name,
        );

        this.startCombatTurn(accessCode, orderedFighters[0]);
    }

    private updateWinningPlayerAfterCombat(player: Player, accessCode: string): void {
        player.hp.current = player.hp.max;
        player.combatWon++;
        this.gameSessionService.updateGameSessionPlayerList(accessCode, player.name, player);
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

    private extractDiceValue(dice: DiceType): number {
        return parseInt(dice.replace(/\D/g, ''), 10) || 1;
    }

    private startCombatTurn(accessCode: string, player: Player): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;
        combatState.playerPerformedAction = false;
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
            if (!combatState.playerPerformedAction) {
                this.performAttack(accessCode, combatState.currentFighter.name);
            }
            // probably un probleme ici
            this.endCombatTurn(accessCode, true);
        }, turnDuration);
    }

    private emitCombatStarted(accessCode: string, attackerSocketId: string, defenderSocketId: string, firstFighter: string): void {
        this.eventEmitter.emit('game.combat.started', { accessCode, attackerSocketId, defenderSocketId, firstFighter });
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

    private emitCombatAttackResult(attackerId: string, defenderId: string, success: boolean, attackScore: number, defenseScore: number): void {
        this.eventEmitter.emit('game.combat.attack.result', {
            attackerId,
            defenderId,
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

    // eslint-disable-next-line max-params
    private emitCombatEnded(accessCode: string, attacker: Player, defender: Player, winner: Player, isEscape: boolean, grid: Tile[][]): void {
        this.eventEmitter.emit('game.combat.ended', {
            accessCode,
            attacker,
            defender,
            winner,
            isEscape,
            grid,
        });
    }
}
