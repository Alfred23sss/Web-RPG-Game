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
        return this.http.post<Game>(`${this.apiUrl}/create`, gameToAdd);
    }

    updateGame(id: string, game: Partial<Game>) {
        console.log('Updating game with payload:', game);
        return this.http.put<Game>(`${this.apiUrl}/update/${id}`, game);
    }

    deleteGame(id: string): Observable<Game> {
        return this.http.delete<Game>(`${this.apiUrl}/delete/${id}`);
    }

    getGameById(id: string): Observable<Game> {
        return this.http.get<Game>(`${this.apiUrl}/${id}`);
    }
}
