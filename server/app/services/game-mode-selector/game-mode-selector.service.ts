import { GameModeType } from '@app/enums/enums';
import { ClassicGameSessionService } from '@app/services/classic-game-session/classic-game-session.service';
import { CTFGameSessionService } from '@app/services/ctf-game-session/ctf-game-session.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameModeSelectorService {
    private gameModes = new Map<string, GameModeType>();

    constructor(
        private readonly classicGameSession: ClassicGameSessionService,
        private readonly ctfGameSession: CTFGameSessionService,
    ) {}

    registerGameMode(accessCode: string, gameMode: GameModeType) {
        this.gameModes.set(accessCode, gameMode);
    }

    getServiceByAccessCode(accessCode: string) {
        const gameMode = this.gameModes.get(accessCode);
        if (!gameMode) throw new Error(`No game mode registered for access code ${accessCode}`);
        return this.getService(gameMode);
    }

    unregisterGameMode(accessCode: string) {
        this.gameModes.delete(accessCode);
    }

    getService(gameMode: GameModeType) {
        switch (gameMode) {
            case GameModeType.CTF:
                return this.ctfGameSession;
            case GameModeType.Classic:
            default:
                return this.classicGameSession;
        }
    }
}
