import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class GameModeService {
    private gameSize: string = '';
    private gameMode: string = '';

    setGameMode(newGameMode: string) {
        this.gameMode = newGameMode;
    }
    setGameSize(newGameSize: string) {
        this.gameSize = newGameSize;
    }

    getGameMode(): string {
        return this.gameMode;
    }
    getGameSize(): string {
        return this.gameSize;
    }
}
