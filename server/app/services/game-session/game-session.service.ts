import { ImageType } from '@app/enums/enums';
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
const PLAYER_MOVE_DELAY = 150;

@Injectable()
export class GameSessionService {
    private gameSessions: Map<string, GameSession> = new Map<string, GameSession>();
    constructor(
        private readonly logger: Logger,
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
        if (gameSession.turn.turnTimers) {
            clearTimeout(gameSession.turn.turnTimers);
            gameSession.turn.turnTimers = null;
        }
        if (gameSession.turn.countdownInterval) {
            clearInterval(gameSession.turn.countdownInterval);
            gameSession.turn.countdownInterval = null;
        }
        if (gameSession.turn.currentPlayer) {
            this.updatePlayer(gameSession.turn.currentPlayer, { isActive: false });
        }
        this.startTransitionPhase(accessCode);
    }
    pauseGameTurn(accessCode: string): number {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return 0;
        const remainingTime = gameSession.turn.currentTurnCountdown;
        if (gameSession.turn.turnTimers) {
            clearTimeout(gameSession.turn.turnTimers);
            gameSession.turn.turnTimers = null;
        }
        if (gameSession.turn.countdownInterval) {
            clearInterval(gameSession.turn.countdownInterval);
            gameSession.turn.countdownInterval = null;
        }
        return remainingTime;
    }
    resumeGameTurn(accessCode: string, remainingTime: number): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        gameSession.turn.currentTurnCountdown = remainingTime;
        this.emitTurnResumed(accessCode, gameSession.turn.currentPlayer, remainingTime);
        let timeLeft = remainingTime;
        gameSession.turn.countdownInterval = setInterval(() => {
            timeLeft--;
            gameSession.turn.currentTurnCountdown = timeLeft;
            this.emitTimerUpdate(accessCode, timeLeft);
            if (timeLeft <= 0) {
                if (gameSession.turn.countdownInterval) {
                    clearInterval(gameSession.turn.countdownInterval);
                }
                gameSession.turn.countdownInterval = null;
            }
        }, SECOND);
        gameSession.turn.turnTimers = setTimeout(() => {
            this.endTurn(accessCode);
        }, remainingTime * SECOND);
    }
    setCombatState(accessCode: string, isInCombat: boolean): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (gameSession) {
            gameSession.turn.isInCombat = isInCombat;
        }
    }
    isCurrentPlayer(accessCode: string, playerName: string): boolean {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession || !gameSession.turn.currentPlayer) return false;
        return gameSession.turn.currentPlayer.name === playerName;
    }

    updateDoorTile(accessCode: string, previousTile: Tile, newTile: Tile): void {
        const grid = this.gameSessions.get(accessCode).game.grid;
        const isAdjacent = this.findAndCheckAdjacentTiles(previousTile.id, newTile.id, grid);
        if (!isAdjacent) return;
        const targetTile = grid.flat().find((tile) => tile.id === newTile.id);
        // ici changer pour quelque chose de plus clean
        if (targetTile.isOpen) {
            targetTile.imageSrc = ImageType.ClosedDoor;
        } else {
            targetTile.imageSrc = ImageType.OpenDoor;
        }
        targetTile.isOpen = !targetTile.isOpen;
        this.logger.log('emit game.door.update');
        this.logger.log(grid);
        this.gameSessions.get(accessCode).game.grid = grid;
        this.eventEmitter.emit('game.door.update', { accessCode, grid });
    }

    async updatePlayerPosition(accessCode: string, movement: Tile[], player: Player): Promise<void> {
        const gameSession = this.gameSessions.get(accessCode);
        let isCurrentlyMoving = true;

        for (let i = 1; i < movement.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, PLAYER_MOVE_DELAY));
            this.clearPlayerFromGrid(gameSession.game.grid, player);
            this.setPlayerOnTile(gameSession.game.grid, movement[i], player);
            if (i === movement.length - 1) {
                isCurrentlyMoving = false;
            }
            this.eventEmitter.emit('game.player.movement', {
                accessCode,
                grid: gameSession.game.grid,
                player,
                isCurrentlyMoving,
            });
        }
    }

    private findAndCheckAdjacentTiles(tileId1: string, tileId2: string, grid: Tile[][]): boolean {
        let tile1Pos: { row: number; col: number } | null = null;
        let tile2Pos: { row: number; col: number } | null = null;
        this.logger.log('on rentre dans la ofnction');
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                if (grid[row][col].id === tileId1) {
                    tile1Pos = { row, col };
                }
                if (grid[row][col].id === tileId2) {
                    tile2Pos = { row, col };
                }
                if (tile1Pos && tile2Pos) break;
            }
            if (tile1Pos && tile2Pos) break;
        }
        if (!tile1Pos || !tile2Pos) return false;
        const isAdjacent = Math.abs(tile1Pos.row - tile2Pos.row) + Math.abs(tile1Pos.col - tile2Pos.col) === 1;
        this.logger.log('on sort de la ofnction');
        return isAdjacent;
    }

    private clearPlayerFromGrid(grid: Tile[][], player: Player): void {
        for (const row of grid) {
            for (const tile of row) {
                if (tile.player && tile.player.name === player.name) {
                    tile.player = undefined;
                }
            }
        }
    }

    private setPlayerOnTile(grid: Tile[][], targetTile: Tile, player: Player): void {
        for (const row of grid) {
            for (const tile of row) {
                if (tile.id === targetTile.id) {
                    tile.player = player;
                    return;
                }
            }
        }
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
            isInCombat: false,
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
        if (gameSession.turn.turnTimers) {
            clearTimeout(gameSession.turn.turnTimers);
            gameSession.turn.turnTimers = null;
        }
        if (gameSession.turn.countdownInterval) {
            clearInterval(gameSession.turn.countdownInterval);
            gameSession.turn.countdownInterval = null;
        }
        gameSession.turn.isTransitionPhase = true;
        gameSession.turn.transitionTimeRemaining = TRANSITION_PHASE_DURATION / SECOND;
        const nextPlayer = this.getNextPlayer(accessCode);
        this.emitTransitionStarted(accessCode, nextPlayer);
        let transitionTimeLeft = TRANSITION_PHASE_DURATION / SECOND;
        gameSession.turn.countdownInterval = setInterval(() => {
            transitionTimeLeft--;
            gameSession.turn.transitionTimeRemaining = transitionTimeLeft;
            this.emitTransitionCountdown(accessCode, transitionTimeLeft);
            if (transitionTimeLeft <= 0) {
                if (gameSession.turn.countdownInterval) {
                    clearInterval(gameSession.turn.countdownInterval);
                }
                gameSession.turn.countdownInterval = null;
            }
        }, SECOND);
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
            return activePlayers[0];
        }

        const currentIndex = activePlayers.findIndex((p) => p.name === gameSession.turn.currentPlayer?.name);

        const nextIndex = (currentIndex + 1) % activePlayers.length;

        return activePlayers[nextIndex];
    }

    private startPlayerTurn(accessCode: string, player: Player): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        gameSession.turn.isTransitionPhase = false;

        gameSession.turn.currentPlayer = player;
        this.updatePlayer(player, { isActive: true });

        gameSession.turn.currentTurnCountdown = TURN_DURATION / SECOND;

        this.emitTurnStarted(accessCode, player);

        if (gameSession.turn.countdownInterval) {
            clearInterval(gameSession.turn.countdownInterval);
            gameSession.turn.countdownInterval = null;
        }

        let timeLeft = TURN_DURATION / SECOND;
        gameSession.turn.countdownInterval = setInterval(() => {
            timeLeft--;
            gameSession.turn.currentTurnCountdown = timeLeft;

            this.emitTimerUpdate(accessCode, timeLeft);

            if (timeLeft <= 0) {
                if (gameSession.turn.countdownInterval) {
                    clearInterval(gameSession.turn.countdownInterval);
                }
                gameSession.turn.countdownInterval = null;
            }
        }, SECOND);

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

    private emitTurnResumed(accessCode: string, player: Player, remainingTime: number): void {
        this.eventEmitter.emit('game.turn.resumed', {
            accessCode,
            player,
            remainingTime,
        });
    }
}
