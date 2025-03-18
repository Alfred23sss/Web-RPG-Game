import { TileType } from '@app/enums/enums';
import { DiceType } from '@app/interfaces/Dice';
import { GameCombatMap } from '@app/interfaces/GameCombatMap';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const ICE_PENALTY = -2;
const WIN_CONDITION = 3;
const ESCAPE_THRESHOLD = 0.3;

@Injectable()
export class CombatInteractionService {
    constructor(
        private readonly lobbyService: LobbyService,
        private readonly eventEmitter: EventEmitter2,
        private readonly logger: Logger,
        private readonly gridManagerService: GridManagerService,
        private readonly gameSessionService: GameSessionService,
    ) {}

    performAttack(accessCode: string, attackerName: string, combatStates: GameCombatMap): { endCombat?: boolean; skipTurnEnd?: boolean } {
        const combatState = combatStates[accessCode];
        if (!combatState) return {};

        const { attacker, defender, currentFighter } = combatState;
        if (currentFighter.name !== attackerName) {
            this.logger.warn(`Not ${attackerName}'s turn in combat`);
            return {};
        }

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
                const updatedGrid = this.resetLoserPlayerPosition(defenderPlayer, accessCode);

                this.eventEmitter.emit('game.combat.player.defeated', {
                    accessCode,
                    winner: currentFighter,
                    loser: defenderPlayer,
                    updatedGrid,
                });

                return { endCombat: true };
            }
        }

        return {};
    }

    attemptEscape(accessCode: string, player: Player, combatStates: GameCombatMap): { escapeSuccessful?: boolean; skipTurnEnd?: boolean } {
        const combatState = combatStates[accessCode];
        if (!combatState) return {};

        const { currentFighter, remainingEscapeAttempts, attacker, defender } = combatState;
        if (currentFighter.name !== player.name) {
            this.logger.warn(`Not ${player.name}'s turn in combat`);
            return {};
        }

        let attemptsLeft = remainingEscapeAttempts.get(player.name) || 0;
        attemptsLeft--;
        this.emitNoMoreEscapesLeft(currentFighter, attemptsLeft);
        remainingEscapeAttempts.set(player.name, attemptsLeft);

        const isEscapeSuccessful = Math.random() < ESCAPE_THRESHOLD;

        if (isEscapeSuccessful) {
            this.logger.log(`Escape successful for ${player.name}`);
            const attackerSocketId = this.lobbyService.getPlayerSocket(attacker.name);
            const defenderSocketId = this.lobbyService.getPlayerSocket(defender.name);

            this.resetHealth([attacker, defender], [attackerSocketId, defenderSocketId], accessCode);
            combatState.hasEvaded = true;

            this.eventEmitter.emit('game.combat.escape.successful', {
                accessCode,
                player,
            });

            return { escapeSuccessful: true };
        } else {
            this.logger.log(`Escape failed for ${player.name}`);
            return {};
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

        const diceValue = this.extractDiceValue(defender.defense.bonusDice);
        const defenseBonus = isDebugMode ? 1 : Math.floor(Math.random() * diceValue) + 1;

        return defender.defense.value + defenseBonus + iceDisadvantage;
    }

    private extractDiceValue(dice: DiceType): number {
        return parseInt(dice.replace(/\D/g, ''), 10) || 1;
    }

    private resetHealth(players: Player[], sockets: string[], accessCode: string): void {
        players.forEach((player, index) => {
            player.hp.current = player.hp.max;
            this.emitUpdatePlayer(player, sockets[index]);
            this.gameSessionService.updateGameSessionPlayerList(accessCode, player.name, player);
        });
    }

    private resetLoserPlayerPosition(player: Player, accessCode: string): Tile[][] {
        const defenderSpawnPoint = this.gridManagerService.findTileBySpawnPoint(this.gameSessionService.getGameSession(accessCode).game.grid, player);

        return this.gridManagerService.teleportPlayer(this.gameSessionService.getGameSession(accessCode).game.grid, player, defenderSpawnPoint);
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

    private emitUpdatePlayer(player: Player, playerSocketId: string): void {
        this.eventEmitter.emit('update.player', { player, playerSocketId });
    }
}
