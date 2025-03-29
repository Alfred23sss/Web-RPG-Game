import { Injectable } from '@angular/core';
import { GameData } from '@app/classes/gameData';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameStateSocketService {
    private gameData = new GameData();
    private gameDataSubject = new BehaviorSubject<GameData>(this.gameData);
    private closePopupSubject = new Subject<void>();

    get closePopup$updateAttackResult(): Observable<void> {
        return this.closePopupSubject.asObservable();
    }
    get gameData$(): Observable<GameData> {
        return this.gameDataSubject.asObservable();
    }

    get gameDataSubjectValue(): GameData {
        return this.gameDataSubject.value;
    }

    updateClosePopup(): void {
        this.closePopupSubject.next();
    }

    initializeListeners(): void {
        this.fetchGameData();
    }

    updateGameData(gameData: GameData): void {
        this.gameData = gameData;
        this.gameDataSubject.next(this.gameData);
    }

    fetchGameData(): void {
        const lobby = sessionStorage.getItem('lobby');
        this.gameData.lobby = lobby ? (JSON.parse(lobby) as Lobby) : this.gameData.lobby;
        const clientPlayer = sessionStorage.getItem('player');
        this.gameData.clientPlayer = clientPlayer ? (JSON.parse(clientPlayer) as Player) : this.gameData.clientPlayer;
        this.gameData.lobby.players = JSON.parse(sessionStorage.getItem('orderedPlayers') || '[]');
        const game = sessionStorage.getItem('game');
        this.gameData.game = game ? (JSON.parse(game) as Game) : this.gameData.game;

        this.gameDataSubject.next(this.gameData);
    }
}
