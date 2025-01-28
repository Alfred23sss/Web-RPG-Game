import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private apiUrl = 'http://localhost:3000/api/games';
    private games: Game[] = [];
    private currentGame: Game | undefined;

    constructor(private http: HttpClient) {}

    getAllGames(): Observable<Game[]> {
        return this.http.get<Game[]>(this.apiUrl);
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
