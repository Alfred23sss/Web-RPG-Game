import { Injectable } from '@angular/core';
import { GRID_DIMENSIONS } from '@app/constants/global.constants';
import { GameMode, GameSize } from '@app/interfaces/game';

@Injectable({
    providedIn: 'root',
})
export class GameModeService {
    private gameSize: string = GameSize.None;
    private gameMode: string = GameMode.None;

    setGameMode(mode: string) {
        this.gameMode = mode;
    }
    setGameSize(size: string): boolean {
        if (this.isValidSize(size)) {
            this.gameSize = size;
            return true;
        }
        return false;
    }

    getGameMode(): string {
        return this.gameMode;
    }
    getGameSize(): string {
        return this.gameSize;
    }

    resetModeAndSize() {
        this.gameMode = '';
        this.gameSize = '';
    }

    private isValidSize(size: string): boolean {
        return Object.values(GRID_DIMENSIONS).includes(Number(size));
    }
}
