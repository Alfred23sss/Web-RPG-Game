import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/interfaces/Player';
import { Turn } from '@app/interfaces/Turn';
import { Tile } from '@app/model/database/tile';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const randomizer = 0.5;
const TRANSITION_PHASE_DURATION = 3000;
const TURN_DURATION = 30000;
const SECOND = 1000;

@Injectable()
export class GameSessionService {
    private gameSessions: Map<string, GameSession> = new Map<string, GameSession>();
    constructor(
        private readonly lobbyService: LobbyService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    createGameSession(accessCode: string): GameSession {
        const lobby = this.lobbyService.getLobby(accessCode);
        const game = lobby.game;
        const grid = game.grid;
        const spawnPoints = this.findSpawnPoints(grid);

        const turn = this.initializeTurn(accessCode);

        const updatedGrid = this.assignPlayersToSpawnPoints(turn.orderedPlayers, spawnPoints, grid);

        game.grid = updatedGrid;
        const gameSession: GameSession = {
            game,
            turn,
        };
        this.gameSessions.set(accessCode, gameSession);
        this.startTransitionPhase(accessCode);
        return gameSession;
    }

    deleteGameSession(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (gameSession) {
            if (gameSession.turn.turnTimers) {
                clearTimeout(gameSession.turn.turnTimers);
            }
            if (gameSession.turn.countdownInterval) {
                clearInterval(gameSession.turn.countdownInterval);
            }
            this.gameSessions.delete(accessCode);
        }
    }
    handlePlayerAbandoned(accessCode: string, playerName: string): Player | null {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return null;

        const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
        if (player) {
            this.updatePlayer(player, { hasAbandoned: true });
            // faudra ajouter la logiue d'enlever le spawnpoint
            // if (tile) {
            //     tile.player = null;
            // }
        }
        return player;
    }

    getPlayers(accessCode: string): Player[] {
        const gameSession = this.gameSessions.get(accessCode);
        return gameSession ? gameSession.turn.orderedPlayers : [];
    }
    endTurn(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        // Clear existing timers
        if (gameSession.turn.turnTimers) {
            clearTimeout(gameSession.turn.turnTimers);
            gameSession.turn.turnTimers = null;
        }
        if (gameSession.turn.countdownInterval) {
            clearInterval(gameSession.turn.countdownInterval);
            gameSession.turn.countdownInterval = null;
        }

        // Set current player as inactive
        if (gameSession.turn.currentPlayer) {
            this.updatePlayer(gameSession.turn.currentPlayer, { isActive: false });
        }

        // Start transition to next player
        this.startTransitionPhase(accessCode);
    }

    private updatePlayer(player: Player, updates: Partial<Player>): void {
        if (player) {
            Object.assign(player, updates);
        }
    }

    private initializeTurn(accessCode: string): Turn {
        return {
            orderedPlayers: this.orderPlayersBySpeed(this.lobbyService.getLobbyPlayers(accessCode)),
            currentPlayer: null,
            currentTurnCountdown: 0,
            turnTimers: null,
            isTransitionPhase: false,
            countdownInterval: null,
        };
    }

    private orderPlayersBySpeed(players: Player[]): Player[] {
        const playerList = [...players].sort((a, b) => {
            if (a.speed === b.speed) {
                return Math.random() < randomizer ? -1 : 1;
            }
            return b.speed - a.speed;
        });

        if (playerList.length > 0) {
            playerList[0].isActive = true;
        }

        Logger.log(`Ordered Players: ${JSON.stringify(playerList.map((p) => ({ name: p.name, speed: p.speed, isActive: p.isActive })))}`);

        return playerList;
    }

    private findSpawnPoints(grid: Tile[][]): Tile[] {
        return grid.flat().filter((tile) => tile.item?.name === 'home');
    }

    private assignPlayersToSpawnPoints(players: Player[], spawnPoints: Tile[], grid: Tile[][]): Tile[][] {
        const shuffledSpawns = [...spawnPoints].sort(() => Math.random() - randomizer);

        players.forEach((player, index) => {
            if (index < shuffledSpawns.length) {
                shuffledSpawns[index].player = player;
            }
        });

        shuffledSpawns.slice(players.length).forEach((spawnPoint) => {
            spawnPoint.item = null;
        });
        return grid;
    }
    private startTransitionPhase(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        // Clear existing timers
        if (gameSession.turn.turnTimers) {
            clearTimeout(gameSession.turn.turnTimers);
            gameSession.turn.turnTimers = null;
        }
        if (gameSession.turn.countdownInterval) {
            clearInterval(gameSession.turn.countdownInterval);
            gameSession.turn.countdownInterval = null;
        }

        // Set transition phase
        gameSession.turn.isTransitionPhase = true;
        gameSession.turn.transitionTimeRemaining = TRANSITION_PHASE_DURATION / SECOND;

        // Find next active player
        const nextPlayer = this.getNextPlayer(accessCode);

        // Emit transition started event
        this.emitTransitionStarted(accessCode, nextPlayer);

        // Start transition timer
        let transitionTimeLeft = TRANSITION_PHASE_DURATION / SECOND;
        gameSession.turn.countdownInterval = setInterval(() => {
            transitionTimeLeft--;
            gameSession.turn.transitionTimeRemaining = transitionTimeLeft;

            // Emit transition countdown update
            this.emitTransitionCountdown(accessCode, transitionTimeLeft);

            if (transitionTimeLeft <= 0) {
                if (gameSession.turn.countdownInterval) {
                    clearInterval(gameSession.turn.countdownInterval);
                }
                gameSession.turn.countdownInterval = null;
            }
        }, SECOND);

        // Schedule end of transition phase
        gameSession.turn.turnTimers = setTimeout(() => {
            this.startPlayerTurn(accessCode, nextPlayer);
        }, TRANSITION_PHASE_DURATION);
    }

    private getNextPlayer(accessCode: string): Player {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) throw new Error('Game session not found');

        const activePlayers = gameSession.turn.orderedPlayers.filter((p) => !p.hasAbandoned);
        if (activePlayers.length === 0) return; // reset tt les joueurs ont abandonné

        if (!gameSession.turn.currentPlayer) {
            // First turn, return first player
            return activePlayers[0];
        }

        const currentIndex = activePlayers.findIndex((p) => p.name === gameSession.turn.currentPlayer?.name);

        const nextIndex = (currentIndex + 1) % activePlayers.length;

        return activePlayers[nextIndex];
    }

    private startPlayerTurn(accessCode: string, player: Player): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        // End transition phase
        gameSession.turn.isTransitionPhase = false;

        // Set current player and mark as active
        gameSession.turn.currentPlayer = player;
        this.updatePlayer(player, { isActive: true });

        // Reset turn countdown
        gameSession.turn.currentTurnCountdown = TURN_DURATION / SECOND;

        // Emit turn started event
        this.emitTurnStarted(accessCode, player);

        // Clear any existing interval timer
        if (gameSession.turn.countdownInterval) {
            clearInterval(gameSession.turn.countdownInterval);
            gameSession.turn.countdownInterval = null;
        }

        // Start turn timer
        let timeLeft = TURN_DURATION / SECOND;
        gameSession.turn.countdownInterval = setInterval(() => {
            timeLeft--;
            gameSession.turn.currentTurnCountdown = timeLeft;

            // Emit timer update
            this.emitTimerUpdate(accessCode, timeLeft);

            if (timeLeft <= 0) {
                if (gameSession.turn.countdownInterval) {
                    clearInterval(gameSession.turn.countdownInterval);
                }
                gameSession.turn.countdownInterval = null;
            }
        }, SECOND);

        // Schedule end of turn
        gameSession.turn.turnTimers = setTimeout(() => {
            this.endTurn(accessCode);
        }, TURN_DURATION);
    }

    private emitTransitionStarted(accessCode: string, nextPlayer: Player): void {
        this.eventEmitter.emit('game.transition.started', { accessCode, nextPlayer });
    }

    private emitTransitionCountdown(accessCode: string, countdown: number): void {
        this.eventEmitter.emit('game.transition.countdown', { accessCode, countdown });
    }

    private emitTurnStarted(accessCode: string, player: Player): void {
        this.eventEmitter.emit('game.turn.started', { accessCode, player });
    }

    private emitTimerUpdate(accessCode: string, timeLeft: number): void {
        this.eventEmitter.emit('game.turn.timer', { accessCode, timeLeft });
    }
}
