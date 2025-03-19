import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GameCommunicationService {
    private apiUrl = `${environment.serverUrl}/games`;

    constructor(private readonly http: HttpClient) {}

    getAllGames(): Observable<Game[]> {
        return this.http.get<Game[]>(`${this.apiUrl}`);
    }

    saveGame(gameToAdd: Game): Observable<Game> {
        return this.http.post<Game>(`${this.apiUrl}/create`, gameToAdd);
    }

    updateGame(id: string, game: Partial<Game>): Observable<Game> {
        return this.http.patch<Game>(`${this.apiUrl}/update/${id}`, game);
    }

    deleteGame(id: string): Observable<Game> {
        return this.http.delete<Game>(`${this.apiUrl}/${id}`);
    }

    getGameById(id: string): Observable<Game> {
        return this.http.get<Game>(`${this.apiUrl}/${id}`);
    }
}
