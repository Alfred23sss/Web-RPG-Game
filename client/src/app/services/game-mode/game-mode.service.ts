import { Injectable } from '@angular/core';
import { GameMode, GameSize } from '@app/interfaces/game';

@Injectable({
    providedIn: 'root',
})
export class GameModeService {
    private gameSize: GameSize = GameSize.None;
    private gameMode: GameMode = GameMode.None;

    setGameMode(mode: GameMode): void {
        this.gameMode = mode;
    }
    setGameSize(size: GameSize): boolean {
        if (!this.isValidSize(size)) return false;
        this.gameSize = size;
        return true;
    }

    getGameMode(): GameMode {
        return this.gameMode;
    }
    getGameSize(): GameSize {
        return this.gameSize;
    }

    resetModeAndSize(): void {
        this.gameMode = GameMode.None;
        this.gameSize = GameSize.None;
    }

    private isValidSize(size: GameSize): boolean {
        return Object.values(GameSize).includes(size);
    }
}
