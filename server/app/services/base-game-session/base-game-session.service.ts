import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/model/database/player';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export abstract class BaseGameSessionService {
    protected gameSessions: Map<string, GameSession> = new Map<string, GameSession>();

    constructor(protected readonly eventEmitter: EventEmitter2) {}

    protected emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }

    protected emitGridUpdate(accessCode: string, grid: unknown): void {
        this.emitEvent('GameGridUpdate', { accessCode, grid });
    }
    // ajouter ici toutes les methodes communes
    abstract createGameSession(accessCode: string): GameSession;
    abstract handlePlayerAbandoned(accessCode: string, playerName: string): Player | null;
    abstract endGameSession(accessCode: string, winner: string): void;
    // ajouter ici toutes les methodes differentes
}
