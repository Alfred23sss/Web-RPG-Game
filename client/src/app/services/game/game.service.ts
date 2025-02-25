import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { ScreenshotService } from '@app/services/generate-screenshots/generate-screenshots.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    games: Game[] = [];
    private currentGame: Game | undefined;

    constructor(
        private gameCommunicationService: GameCommunicationService,
        private gridService: GridService,
        private screenShotService: ScreenshotService,
    ) {
        this.loadCurrentGame();
    }

    updateCurrentGame(game: Game): void {
        this.currentGame = game;
        sessionStorage.setItem('currentGame', JSON.stringify(game));
    }

    createNewGame(gameMode: string, gridSize: number): Game {
        return {
            id: uuidv4(),
            name: '',
            size: gridSize.toString(),
            mode: gameMode,
            lastModified: new Date(),
            isVisible: false,
            previewImage: '',
            description: '',
            grid: this.gridService.createGrid(gridSize, gridSize),
        };
    }

    deleteGame(id: string): Observable<Game> {
        return this.gameCommunicationService.deleteGame(id).pipe(
            tap(() => {
                this.removeGame(id);
                this.fetchGames().subscribe();
            }),
        );
    }

    getGames(): Game[] {
        return this.games;
    }

    getGameById(id: string): Game | undefined {
        return this.games.find((game) => game.id === id);
    }

    fetchGames(): Observable<Game[]> {
        return this.gameCommunicationService.getAllGames().pipe(
            tap((response) => {
                this.games = response;
            }),
        );
    }

    updateGameVisibility(id: string, isVisible: boolean): void {
        const game = this.getGameById(id);
        if (game) {
            game.isVisible = isVisible;
            this.saveGame(game);
        }
    }

    saveGame(gameToAdd: Game): void {
        // this.fetchGames().subscribe();
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

    isGameNameUsed(name: string): boolean {
        return this.games.some((game) => game.name === name && game.id !== this.currentGame?.id);
    }

    async savePreviewImage(): Promise<string> {
        return await this.screenShotService.generatePreview('game-preview');
    }

    private getGameIndexById(id: string): number {
        return this.games.findIndex((game) => game.id === id);
    }

    private removeGame(id: string): void {
        this.games = this.games.filter((game) => game.id !== id);
    }

    private addGame(game: Game): void {
        this.games.push(game);
    }

    private loadCurrentGame(): void {
        const savedGame = sessionStorage.getItem('currentGame');
        if (savedGame) {
            const parsedGame: Game = JSON.parse(savedGame);
            parsedGame.lastModified = new Date(parsedGame.lastModified);
            this.currentGame = parsedGame;
        }
    }

    private updateExistingGame(gameToUpdate: Game): void {
        gameToUpdate.lastModified = new Date();
        this.gameCommunicationService.updateGame(gameToUpdate.id, gameToUpdate).subscribe({
            next: (updatedGame) => {
                const index = this.getGameIndexById(gameToUpdate.id);
                if (index !== -1) {
                    this.games[index] = updatedGame;
                }
            },
        });
    }

    private saveNewGame(gameToAdd: Game): void {
        this.gameCommunicationService.saveGame(gameToAdd).subscribe({
            next: (game) => {
                this.addGame(game);
            },
        });
    }
}
