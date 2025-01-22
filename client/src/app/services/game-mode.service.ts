import { Injectable } from '@angular/core';
export enum GameMode {
    Classic = 'Classic',
    CTF = 'CTF',
    None = '',
}
export enum GameSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
    None = '',
}

@Injectable({
    providedIn: 'root',
})
export class GameModeService {
    private gameSize: string = GameSize.None;
    private gameMode: string = GameSize.None;

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
