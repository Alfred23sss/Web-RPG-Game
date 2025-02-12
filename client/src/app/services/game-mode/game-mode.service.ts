import { Injectable } from '@angular/core';
import { GameMode, GameSize } from '@app/enums/global.enums';

@Injectable({
    providedIn: 'root',
})
export class GameModeService {
    private gameSize: GameSize = GameSize.None;
    private gameMode: GameMode = GameMode.None;

    setGameMode(mode: GameMode) {
        this.gameMode = mode;
    }
    setGameSize(size: GameSize): boolean {
        if (this.isValidSize(size)) {
            this.gameSize = size;
            return true;
        }
        return false;
    }

    getGameMode(): GameMode {
        return this.gameMode;
    }
    getGameSize(): GameSize {
        return this.gameSize;
    }

    resetModeAndSize() {
        this.gameMode = GameMode.None;
        this.gameSize = GameSize.None;
    }

    private isValidSize(size: GameSize): boolean {
        return Object.values(GameSize).includes(size);
    }
}
