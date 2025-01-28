import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private games: Game[] = [];
    private currentGame: Game | undefined;

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
