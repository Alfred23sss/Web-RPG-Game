import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/interfaces/Player';
import { Turn } from '@app/interfaces/Turn';
import { Tile } from '@app/model/database/tile';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable, Logger } from '@nestjs/common';

const randomizer = 0.5;

@Injectable()
export class GameSessionService {
    private gameSessions: Map<string, GameSession> = new Map<string, GameSession>();

    constructor(private readonly lobbyService: LobbyService) {}

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
        return gameSession;
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
}
