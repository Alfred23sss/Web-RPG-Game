import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private games: Game[] = [];
    private currentGame: Game | undefined;

    private readonly API_BASE_URL = 'http://localhost:3000/api';

    constructor(private http: HttpClient) {
        this.loadGamesFromServer();
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

    loadGamesFromServer(): void {
        this.http.get<Game[]>(`${this.API_BASE_URL}/game`).subscribe({
            next: (fetchedGames) => {
                this.games = fetchedGames;
                console.log(this.games);
            },
            error: (err) => {
                console.error('Error fetching games from server:', err);
            },
        });
    }

    saveGame(gameToAdd: Game) {
        this.http.post<Game>(`${this.API_BASE_URL}/game`, gameToAdd).subscribe({
            next: (createdGame) => {
                this.games.push(createdGame);
            },
            error: (err) => {
                console.error('Error adding game to server:', err);
            },
        });
        console.log('saved');
    }

    getGameByName(name: string): Game | undefined {
        return this.games.find((game) => game.name === name);
    }

    removeGame(name: string) {
        this.games = this.games.filter((game) => game.name !== name);
    }
}
