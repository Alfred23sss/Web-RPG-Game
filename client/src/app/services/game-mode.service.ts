import { Injectable } from '@angular/core';
import { GameMode, GameSize } from '@app/interfaces/game';

@Injectable({
    providedIn: 'root',
})
export class GameModeService {
    private gameSize: string = GameSize.None;
    private gameMode: string = GameMode.None;

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
