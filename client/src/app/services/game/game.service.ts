import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { tap } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    games: Game[];
    private currentGame: Game | undefined;
    constructor(private gameCommunicationService: GameCommunicationService) {
        this.loadCurrentGame();
    }

    updateCurrentGame(game: Game) {
        this.currentGame = game;
        sessionStorage.setItem('currentGame', JSON.stringify(game));
    }

    deleteGame(id: string) {
        return this.gameCommunicationService.deleteGame(id).pipe(
            tap(() => {
                this.removeGame(id);
            }),
        );
    }

    addGame(game: Game) {
        this.games.push(game);
    }

    getGames(): Game[] {
        return this.games;
    }

    getGameById(id: string): Game | undefined {
        return this.games.find((game) => game.id === id);
    }

    removeGame(id: string) {
        this.games = this.games.filter((game) => game.id !== id);
    }

    fetchGames() {
        return this.gameCommunicationService.getAllGames().pipe(
            tap((response) => {
                console.log('Games fetched, updating games array in service:', response);
                this.games = response;
            }),
        );
    }

    saveGame(gameToAdd: Game): void {
        const existingGame = this.getGameById(gameToAdd.id);
        if (existingGame) {
            this.updateExistingGame(gameToAdd);
        } else {
            this.saveNewGame(gameToAdd);
        }
    }

    getCurrentGame(): Game | undefined {
        if (!this.currentGame) {
            this.loadCurrentGame();
        }
        return this.currentGame;
    }

    clearCurrentGame() {
        this.currentGame = undefined;
        sessionStorage.removeItem('currentGame');
    }

    isGameNameUsed(name: string): boolean {
        return this.games.some((game) => game.name === name && game.id !== this.currentGame?.id);
    }

    private loadCurrentGame() {
        const savedGame = sessionStorage.getItem('currentGame');
        if (savedGame) {
            this.currentGame = JSON.parse(savedGame);
        }
    }

    private updateExistingGame(gameToUpdate: Game): void {
        this.gameCommunicationService.updateGame(gameToUpdate.id, gameToUpdate).subscribe({
            next: (updatedGame) => {
                console.log('Game successfully updated:', updatedGame);

                const index = this.games.findIndex((game) => game.id === gameToUpdate.id);
                if (index !== -1) {
                    this.games[index] = gameToUpdate;
                }
            },
            error: (err) => {
                console.error('Error updating game:', err);
            },
        });
    }

    private saveNewGame(gameToAdd: Game): void {
        this.gameCommunicationService.saveGame(gameToAdd).subscribe({
            next: (newGame) => {
                console.log('Game successfully saved:', newGame);

                this.addGame(gameToAdd);
            },
            error: (err) => {
                console.error('Error saving game:', err);
            },
        });
    }
}
