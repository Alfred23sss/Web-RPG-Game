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
        return this.http.post<string>(`${this.apiUrl}`, {});
    }

    validateAccessCode(code: string): Observable<{ isValid: boolean }> {
        return this.http.get<{ isValid: boolean }>(`${this.apiUrl}/${code}/validate`);
    }

    // getAllAccessCodes(): Observable<string[]> {
    //     return this.http.get<string[]>(`${this.apiUrl}`);
    // }

    removeAccessCode(code: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${code}`);
    }
}
