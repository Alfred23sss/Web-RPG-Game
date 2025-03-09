import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/Player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TurnService {
    private readonly logger = new Logger(TurnService.name);

    constructor(private readonly lobbyService: LobbyService) {}

    startTurnTimer(game: Game, duration: number, accessCode: string): void {
        this.clearTurnTimer(game);

        game.turn.players = this.lobbyService.getLobbyPlayers(accessCode);

        game.turn.currentPlayer = game.turn.players[0];
        let remaining = duration;

        game.turn.turnTimers = setInterval(() => {
            remaining--;
            this.updateGameState(game, {
                turn: {
                    ...game.turn,
                    currentTurnCountdown: remaining,
                },
            });

            if (remaining <= 0) {
                this.handleTurnEnd(game);
            }
        }, 1000);

        this.updateGameState(game, {
            turn: {
                ...game.turn,
                currentTurnCountdown: duration,
                turnTimers: game.turn.turnTimers,
            },
        });
    }

    handleTurnEnd(game: Game): void {
        this.clearTurnTimer(game);
        const nextPlayer = this.getNextPlayer(game);

        this.updateGameState(game, {
            turn: {
                ...game.turn,
                currentPlayer: nextPlayer,
                currentTurnCountdown: 0,
                turnTimers: null,
            },
        });

        this.startTransitionPhase(game);
    }

    private startTransitionPhase(game: Game): void {
        setTimeout(() => {
            this.startTurnTimer(game, 60, this.lobbyService.getLobbyIdByPlayer(game.turn.currentPlayer.name));
        }, 5000);
    }

    private updateGameState(game: Game, update: Partial<Game>): void {
        const updatedGame = { ...game, ...update };
        /*
        this.lobbyService.updateGameState(this.lobbyService.getLobbyIdByPlayer(game.turn.currentPlayer.name), updatedGame);

        // Diffusion du nouvel état à tous les joueurs
        const server: Server = this.lobbyService.getSocketServer();
        server.to(this.lobbyService.getLobbyIdByPlayer(game.turn.currentPlayer.name)).emit('game-state-updated', updatedGame);
        */
    }

    clearTurnTimer(game: Game): void {
        if (game.turn.turnTimers) {
            clearInterval(game.turn.turnTimers);
            this.updateGameState(game, {
                turn: { ...game.turn, turnTimers: null },
            });
        }
    }

    private getNextPlayer(game: Game): Player {
        const currentIndex = game.turn.players.findIndex((p) => p === game.turn.currentPlayer);
        const nextIndex = (currentIndex + 1) % game.turn.players.length;
        return game.turn.players[nextIndex];
    }
}
