import { EventEmit, ImageType, ItemName } from '@app/enums/enums';
import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/model/database/tile';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const PLAYER_MOVE_DELAY = 150;

@Injectable()
export class GameSessionService {
    private gameSessions: Map<string, GameSession> = new Map<string, GameSession>();

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly eventEmitter: EventEmitter2,
        private readonly gridManager: GridManagerService,
        private readonly turnService: GameSessionTurnService,
    ) {
        this.eventEmitter.on(EventEmit.GameTurnTimeout, ({ accessCode }) => {
            this.endTurn(accessCode);
        });
    }

    createGameSession(accessCode: string): GameSession {
        const lobby = this.lobbyService.getLobby(accessCode);
        const game = lobby.game;
        const grid = this.gridManager.assignItemsToRandomItems(game.grid);
        const spawnPoints = this.gridManager.findSpawnPoints(grid);
        const turn = this.turnService.initializeTurn(accessCode);
        turn.beginnerPlayer = turn.orderedPlayers[0];
        const [players, updatedGrid] = this.gridManager.assignPlayersToSpawnPoints(turn.orderedPlayers, spawnPoints, grid);
        game.grid = updatedGrid;
        const gameSession: GameSession = { game, turn };
        this.gameSessions.set(accessCode, gameSession);
        this.updatePlayerListSpawnPoint(players, accessCode);
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
            const spawnTileId = player.spawnPoint?.tileId;
            this.updatePlayer(player, { hasAbandoned: true });
            if (spawnTileId) {
                const spawnTile = this.gridManager.findTileById(gameSession.game.grid, spawnTileId);
                if (spawnTile) {
                    spawnTile.item = undefined;
                }
            }
            this.gridManager.clearPlayerFromGrid(gameSession.game.grid, playerName);
            this.emitGridUpdate(accessCode, gameSession.game.grid);
        }
        if (gameSession.turn.currentPlayer.name === playerName) {
            this.endTurn(accessCode);
        }
        if (player.isAdmin) {
            this.eventEmitter.emit(EventEmit.AdminModeDisabled, { accessCode });
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
        gameSession.turn.beginnerPlayer = this.turnService.getNextPlayer(accessCode, gameSession.turn);
        this.turnService.endTurn(gameSession.turn);
        this.startTransitionPhase(accessCode);
    }

    pauseGameTurn(accessCode: string): number {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return 0;

        return this.turnService.pauseTurn(gameSession.turn);
    }

    resumeGameTurn(accessCode: string, remainingTime: number): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        this.turnService.resumeTurn(accessCode, gameSession.turn, remainingTime);
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
        const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
        return gameSession.turn.currentPlayer.name === playerName && !player?.hasAbandoned;
    }

    updateDoorTile(accessCode: string, previousTile: Tile, newTile: Tile): void {
        const grid = this.gameSessions.get(accessCode).game.grid;
        const isAdjacent = this.gridManager.findAndCheckAdjacentTiles(previousTile.id, newTile.id, grid);
        if (!isAdjacent) return;
        const targetTile = grid.flat().find((tile) => tile.id === newTile.id);

        if (targetTile.isOpen) {
            targetTile.imageSrc = ImageType.ClosedDoor;
        } else {
            targetTile.imageSrc = ImageType.OpenDoor;
        }
        targetTile.isOpen = !targetTile.isOpen;
        this.gameSessions.get(accessCode).game.grid = grid;
        this.eventEmitter.emit(EventEmit.GameDoorUpdate, { accessCode, grid });
    }

    updatePlayer(player: Player, updates: Partial<Player>): void {
        this.turnService.updatePlayer(player, updates);
    }

    updateGameSessionPlayerList(accessCode: string, playername: string, updates: Partial<Player>): void {
        const players = this.getPlayers(accessCode);
        const player = players.find((p) => p.name === playername);
        this.updatePlayer(player, updates);
    }

    async updatePlayerPosition(accessCode: string, movement: Tile[], player: Player): Promise<void> {
        const gameSession = this.gameSessions.get(accessCode);
        let isCurrentlyMoving = true;
        for (let i = 1; i < movement.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, PLAYER_MOVE_DELAY));
            this.gridManager.clearPlayerFromGrid(gameSession.game.grid, player.name);
            this.gridManager.setPlayerOnTile(gameSession.game.grid, movement[i], player);
            if (i === movement.length - 1) {
                isCurrentlyMoving = false;
            }
            if (movement[i].item !== undefined && movement[i].item.name !== ItemName.Home) {
                isCurrentlyMoving = false;
            }
            this.eventEmitter.emit(EventEmit.GamePlayerMovement, {
                accessCode,
                grid: gameSession.game.grid,
                player,
                isCurrentlyMoving,
            });
            if (!isCurrentlyMoving) {
                break;
            }
        }
    }

    endGameSession(accessCode: string, winner: string) {
        this.emitEvent(EventEmit.GameEnded, { accessCode, winner });
    }

    getGameSession(accessCode: string): GameSession {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        return gameSession;
    }

    callTeleport(accessCode: string, player: Player, targetTile: Tile): void {
        const updatedGrid = this.gridManager.teleportPlayer(this.getGameSession(accessCode).game.grid, player, targetTile);
        this.getGameSession(accessCode).game.grid = updatedGrid;
        this.emitGridUpdate(accessCode, updatedGrid);
    }

    emitGridUpdate(accessCode: string, grid: Tile[][]): void {
        this.eventEmitter.emit(EventEmit.GameGridUpdate, {
            accessCode,
            grid,
        });
    }

    private updatePlayerListSpawnPoint(players: Player[], accessCode: string): void {
        const gameSession = this.getGameSession(accessCode);
        for (const playerUpdated of players) {
            if (playerUpdated.spawnPoint) {
                const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerUpdated.name);
                if (player) {
                    this.updatePlayer(player, playerUpdated);
                }
            }
        }
    }

    private startTransitionPhase(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        this.turnService.startTransitionPhase(accessCode, gameSession.turn);
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
