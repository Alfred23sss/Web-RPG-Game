import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/interfaces/Player';
import { Turn } from '@app/interfaces/Turn';
import { Game } from '@app/model/database/game';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';

const randomizer = 0.5;

@Injectable()
export class GameSessionService {
    private gameSessions: Map<string, GameSession> = new Map<string, GameSession>();
    constructor(private readonly lobbyService: LobbyService) {}

    createGameSession(accessCode: string, game: Game): GameSession {
        const gameSession: GameSession = {
            game,
            turn: this.initializeTurn(accessCode),
        };
        this.gameSessions.set(accessCode, gameSession);
        return gameSession;
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
        const playerList = players.sort((a, b) => {
            if (a.speed === b.speed) {
                return Math.random() - randomizer;
            }
            return b.speed - a.speed;
        });
        playerList[0].isActive = true;
        return playerList;
    }
    // startTurnTimer(game: Game, duration: number, accessCode: string): void {

    // }

    // private startTransitionPhase(game: Game): void {
    //     setTimeout(() => {
    //         this.startTurnTimer(game, 60, this.lobbyService.getLobbyIdByPlayer(game.turn.currentPlayer.name));
    //     }, 5000);
    // }

    // private updateGameState(game: Game, update: Partial<Game>): void {
    //
    // }

    // clearTurnTimer(game: Game): void {
    //
    // }

    // private getNextPlayer(game: Game): Player {
    //
    // }
}
