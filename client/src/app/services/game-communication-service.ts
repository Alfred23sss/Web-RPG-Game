import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameCommunicationService {
    private apiUrl = 'http://localhost:3000/api/games';

    constructor(private readonly http: HttpClient) {}

    getAllGames(): Observable<Game[]> {
        return this.http.get<Game[]>(this.apiUrl);
    }

    saveGame(gameToAdd: Game): Observable<Game> {
        return this.http.post<Game>(`${this.apiUrl}/game`, gameToAdd);
    }
}
