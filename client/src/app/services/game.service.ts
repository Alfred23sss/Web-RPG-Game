/* eslint-disable prettier/prettier */
import { Injectable } from '@angular/core';

export interface Game {
    name: string;
    size: string;
    mode: string;
    lastModified: Date;
    isVisible: boolean;
    previewImage: string; // path to img
    description: string;
}

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private games: Game[] = [];
    private currentGame: Game | undefined;

    updateCurrentGame(game: Game) {
        this.currentGame = game;
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
