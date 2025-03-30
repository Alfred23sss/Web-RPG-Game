/* eslint-disable no-unused-vars */ // juste pour live pour montrer la structure sans implementer enlever apres
import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/model/database/player';
import { BaseGameSessionService } from '@app/services/base-game-session/base-game-session.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CTFGameSessionService extends BaseGameSessionService {
    protected gameSessions: Map<string, GameSession> = new Map<string, GameSession>();

    // ajouter methode precise a CTF
    createGameSession(accessCode: string): GameSession {
        return;
    }

    handlePlayerAbandoned(accessCode: string, playerName: string): Player | null {
        return;
    }

    endGameSession(accessCode: string, winner: string): void {
        return;
    }
}
