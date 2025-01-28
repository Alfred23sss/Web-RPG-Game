import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { GameCommunicationService } from './game-communication-service';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    games: Game[];
    private currentGame: Game | undefined;

    constructor(private gameCommunicationService: GameCommunicationService) {}

    fetchGames() {
        this.gameCommunicationService.getAllGames().subscribe(
            (response) => {
                console.log('Received games:', response);
                this.games = response;
            },
            (error) => {
                console.error('Error fetching games:', error);
            },
        );
    }

    saveGame(gameToAdd: Game) {
        this.gameCommunicationService.saveGame(gameToAdd).subscribe({
            next: (createdGame) => {
                console.log('Game successfully saved:', createdGame);
            },
            error: (err) => {
                console.error('Error saving game:', err);
            },
        });
    }

    updateCurrentGame(game: Game | undefined) {
        this.currentGame = game;

        if (this.currentGame) {
            const gameIndex = this.games.findIndex((g) => g.name === this.currentGame?.name);
            if (gameIndex !== -1) {
                this.games[gameIndex] = this.currentGame;
            }
        }
    }
    getCurrentGame() {
        return this.currentGame;
    }

    addGame(game: Game) {
        this.games.push(game);
    }

    getGames(): Game[] {
        return this.games;
    }

    getGameByName(name: string): Game | undefined {
        return this.games.find((game) => game.name === name);
    }

    removeGame(name: string) {
        this.games = this.games.filter((game) => game.name !== name);
    }
}
