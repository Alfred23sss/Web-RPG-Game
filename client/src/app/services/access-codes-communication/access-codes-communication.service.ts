import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AccessCodesCommunicationService {
    private apiUrl = 'http://localhost:3000/api/accessCodes';

    constructor(private readonly http: HttpClient) {}

    generateAccessCode(): Observable<string> {
        return this.http.post<string>(`${this.apiUrl}/generate`, {});
    }

    validateAccessCode(code: string): Observable<boolean> {
        return this.http.get<boolean>(`${this.apiUrl}/validate/${code}`);
    }

    getAllAccessCodes(): Observable<string[]> {
        return this.http.get<string[]>(`${this.apiUrl}/all`);
    }

    removeAccessCode(code: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/remove`, { code });
    }
}
