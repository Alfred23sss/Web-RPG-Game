import { TileType } from '@app/enums/enums';
import { CombatState } from '@app/interfaces/CombatState';
import { DiceType } from '@app/interfaces/Dice';
import { GameCombatMap } from '@app/interfaces/GameCombatMap';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const COMBAT_TURN_DURATION = 5000;
const COMBAT_ESCAPE_LIMITED_DURATION = 3000;
const MAX_ESCAPE_ATTEMPTS = 2;
const SECOND = 1000;
const ESCAPE_THRESHOLD = 0.3;
const ICE_PENALTY = -2;
const WIN_CONDITION = 3;

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
        if (combatState.attacker.name === playerName || combatState.defender.name === playerName) {
            const playerToUpdate = combatState.currentFighter.name === playerName ? combatState.currentFighter : combatState.defender;
            this.updateWinningPlayerAfterCombat(playerToUpdate, accessCode);
            this.emitUpdatePlayerList(this.gameSessionService.getPlayers(accessCode), accessCode);
            this.endCombat(accessCode);
        }
    }

    endCombatTurn(accessCode: string): void {
        this.logger.log('Ending combat turn ...');
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        this.resetCombatTimers(accessCode);

        const nextFighter = this.getNextCombatFighter(accessCode);
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
        this.resetCombatTimers(accessCode);
        combatState.playerPerformedAction = true;

        this.logger.log(`${currentFighter.name}, ${attackerName}`);

        const attackerScore = this.getRandomAttackScore(currentFighter, accessCode, combatState.isDebugMode);
        const defenderPlayer = currentFighter === attacker ? defender : attacker;
        const defenseScore = this.getRandomDefenseScore(defenderPlayer, accessCode, combatState.isDebugMode);
        const attackSuccessful = attackerScore > defenseScore;
        const currentFighterSocket = this.lobbyService.getPlayerSocket(currentFighter.name);
        const defenderPlayerSocket = this.lobbyService.getPlayerSocket(defenderPlayer.name);
        this.emitCombatAttackResult(currentFighterSocket, defenderPlayerSocket, attackSuccessful, attackerScore, defenseScore);

        if (attackSuccessful) {
            const attackDamage = attackerScore - defenseScore;
            defenderPlayer.hp.current = Math.max(0, defenderPlayer.hp.current - attackDamage);
            this.emitUpdatePlayer(defenderPlayer, defenderPlayerSocket);
            this.logger.log(`${currentFighter.name} attacked ${defenderPlayer.name} for ${attackDamage} damage`);
            this.logger.log(`${defenderPlayer.name} has ${defenderPlayer.hp.current} hp left, combat will stop if under 0`);
            if (defenderPlayer.hp.current === 0) {
                currentFighter.combatWon++;
                this.resetHealth([currentFighter, defenderPlayer], [currentFighterSocket, defenderPlayerSocket], accessCode);
                const updatedGridAfterTeleportation = this.resetLoserPlayerPosition(defenderPlayer, accessCode);
                this.endCombat(accessCode, false);
                this.gameSessionService.emitGridUpdate(accessCode, updatedGridAfterTeleportation);
                if (this.checkPlayerWon(accessCode, currentFighter)) {
                    this.logger.log('ending combat in gameCombat');
                    this.endCombat(accessCode);
                    return;
                }
                this.logger.log(`player list from gamessession ${this.gameSessionService.getPlayers(accessCode)}`);
                this.emitUpdatePlayerList(this.gameSessionService.getPlayers(accessCode), accessCode);
                if (combatState.attacker === defenderPlayer) {
                    this.gameSessionService.endTurn(accessCode);
                    return;
                }
                return;
            }
        }
        this.endCombatTurn(accessCode);
    }

    attemptEscape(accessCode: string, player: Player): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        this.resetCombatTimers(accessCode);

        const { currentFighter, remainingEscapeAttempts, attacker, defender } = combatState;
        combatState.playerPerformedAction = true;
        // useless code?? button not even available when not player turn
        if (currentFighter.name !== player.name) {
            this.logger.warn(`Not ${player.name}'s turn in combat`);
            return;
        }

        let attemptsLeft = remainingEscapeAttempts.get(player.name) || 0;
        attemptsLeft--;
        this.emitNoMoreEscapesLeft(currentFighter, attemptsLeft);
        remainingEscapeAttempts.set(player.name, attemptsLeft);
        const isEscapeSuccessful = Math.random() < ESCAPE_THRESHOLD;
        // if (attemptsLeft === 0) {
        //     this.emitNoMoreEscapesLeft(currentFighter);
        // }

        if (isEscapeSuccessful) {
            this.logger.log(`Escape successful for ${player.name}`);
            const attackerSocketId = this.lobbyService.getPlayerSocket(attacker.name);
            const defenderSocketId = this.lobbyService.getPlayerSocket(defender.name);
            this.resetHealth([attacker, defender], [attackerSocketId, defenderSocketId], accessCode);
            combatState.hasEvaded = true;
            this.endCombat(accessCode, true);
        } else {
            this.logger.log(`Escape failed for ${player.name}`);
            this.endCombatTurn(accessCode);
        }
    }

    checkPlayerWon(accessCode: string, player: Player): boolean {
        if (player.combatWon === WIN_CONDITION) {
            this.gameSessionService.endGameSession(accessCode, player.name);
            return true;
        }
        return false;
    }

    endCombat(accessCode: string, isEscape: boolean = false): void {
        const combatState = this.combatStates[accessCode];
        if (!combatState) return;

        this.resetCombatTimers(accessCode);

        const { attacker, defender, currentFighter, pausedGameTurnTimeRemaining } = combatState;

        this.emitCombatEnded(attacker, defender, currentFighter, combatState.hasEvaded);
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
            isDebugMode,
            hasEvaded: false,
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
        if (this.checkPlayerWon(accessCode, player)) {
            this.gameSessionService.endGameSession(accessCode, player.name);
        }
        this.gameSessionService.updateGameSessionPlayerList(accessCode, player.name, player);
        this.emitUpdatePlayer(player, this.lobbyService.getPlayerSocket(player.name));
        this.emitUpdatePlayerList(this.gameSessionService.getPlayers(accessCode), accessCode);
    }

    private resetHealth(players: Player[], sockets: string[], accessCode): void {
        players.forEach((player, index) => {
            player.hp.current = player.hp.max;
            const playerSocketId = sockets[index];
            this.emitUpdatePlayer(player, playerSocketId);
            this.gameSessionService.updateGameSessionPlayerList(accessCode, player.name, player);
        });
    }

    private resetLoserPlayerPosition(player: Player, accessCode: string): Tile[][] {
        const defenderSpawnPoint = this.gridManagerService.findTileBySpawnPoint(this.gameSessionService.getGameSession(accessCode).game.grid, player);
        const updatedGridAfterTeleportation = this.gridManagerService.teleportPlayer(
            this.gameSessionService.getGameSession(accessCode).game.grid,
            player,
            defenderSpawnPoint,
        );
        return updatedGridAfterTeleportation;
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

    private getRandomAttackScore(attacker: Player, accessCode: string, isDebugMode: boolean): number {
        let iceDisadvantage = 0;
        const tile = this.gridManagerService.findTileByPlayer(this.gameSessionService.getGameSession(accessCode).game.grid, attacker);
        if (tile && tile.type === TileType.Ice) {
            iceDisadvantage = ICE_PENALTY;
        }
        const diceValue = this.extractDiceValue(attacker.attack.bonusDice);
        const attackBonus = isDebugMode ? diceValue : Math.floor(Math.random() * diceValue) + 1;
        return attacker.attack.value + attackBonus + iceDisadvantage;
    }

    private getRandomDefenseScore(defender: Player, accessCode: string, isDebugMode: boolean): number {
        let iceDisadvantage = 0;
        const tile = this.gridManagerService.findTileByPlayer(this.gameSessionService.getGameSession(accessCode).game.grid, defender);
        if (tile && tile.type === TileType.Ice) {
            iceDisadvantage = ICE_PENALTY;
        }
        const defenseBonus = isDebugMode ? 1 : Math.floor(Math.random() * this.extractDiceValue(defender.defense.bonusDice)) + 1;
        return defender.defense.value + defenseBonus + iceDisadvantage;
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
        const defender = combatState.currentFighter === combatState.attacker ? combatState.defender : combatState.attacker;

        const escapeAttemptsRemaining = combatState.remainingEscapeAttempts.get(player.name) || 0;
        const turnDuration = escapeAttemptsRemaining > 0 ? COMBAT_TURN_DURATION : COMBAT_ESCAPE_LIMITED_DURATION;
        const turnDurationInSeconds = turnDuration / SECOND;

        combatState.combatTurnTimeRemaining = turnDurationInSeconds;

        this.emitCombatTurnStarted(accessCode, player, turnDurationInSeconds, escapeAttemptsRemaining, defender);

        if (combatState.combatCountdownInterval) {
            clearInterval(combatState.combatCountdownInterval);
            combatState.combatCountdownInterval = null;
        }

        let timeLeft = turnDurationInSeconds;
        this.emitCombatTimerUpdate(accessCode, timeLeft, combatState.attacker, combatState.defender);
        combatState.combatCountdownInterval = setInterval(() => {
            timeLeft--;
            combatState.combatTurnTimeRemaining = timeLeft;

            this.emitCombatTimerUpdate(accessCode, timeLeft, combatState.attacker, combatState.defender);

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
        }, turnDuration);
    }

    private emitCombatStarted(accessCode: string, attackerSocketId: string, defenderSocketId: string, firstFighter: string): void {
        this.eventEmitter.emit('game.combat.started', { accessCode, attackerSocketId, defenderSocketId, firstFighter });
    }

    private emitUpdatePlayer(player: Player, playerSocketId: string) {
        this.eventEmitter.emit('update.player', { player, playerSocketId });
    }

    private emitUpdatePlayerList(players: Player[], accessCode: string) {
        this.logger.log(players);
        this.eventEmitter.emit('update.player.list', { players, accessCode });
    }

    private emitCombatTurnStarted(accessCode: string, fighter: Player, duration: number, escapeAttemptsLeft: number, defender: Player): void {
        const attackerSocketId = this.lobbyService.getPlayerSocket(fighter.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(defender.name);
        this.eventEmitter.emit('game.combat.turn.started', {
            accessCode,
            fighter,
            duration,
            escapeAttemptsLeft,
            attackerSocketId,
            defenderSocketId,
        });
    }

    private emitCombatTimerUpdate(accessCode: string, timeLeft: number, attacker: Player, defender: Player): void {
        const attackerSocketId = this.lobbyService.getPlayerSocket(attacker.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(defender.name);
        this.eventEmitter.emit('game.combat.timer', { accessCode, timeLeft, attackerSocketId, defenderSocketId });
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

    private emitNoMoreEscapesLeft(player: Player, attemptsLeft: number): void {
        const playerSocketId = this.lobbyService.getPlayerSocket(player.name);
        this.eventEmitter.emit('game.combat.escape.failed', {
            player,
            playerSocketId,
            attemptsLeft,
        });
    }

    private emitCombatEnded(attacker: Player, defender: Player, winner: Player, hasEvade: boolean): void {
        this.logger.log('emitting to gateaway game ended');
        const attackerSocketId = this.lobbyService.getPlayerSocket(attacker.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(defender.name);

        this.eventEmitter.emit('game.combat.ended', {
            attackerSocketId,
            defenderSocketId,
            winner,
            hasEvade,
        });
        // eslint-disable-next-line max-lines
    }
}
