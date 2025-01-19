import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class GameModeService {
    private gameMode: string = 'defaultGameMode';

    setGameMode(newGameMode: string) {
        this.gameMode = newGameMode;
    }

    getGameMode(): string {
        return this.gameMode;
    }
}
