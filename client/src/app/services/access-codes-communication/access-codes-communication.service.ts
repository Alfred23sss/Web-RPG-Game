import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class AccessCodesCommunicationService {
    private apiUrl = `${environment.serverUrl}/accessCodes`;

    constructor(private readonly http: HttpClient) {}

    generateAccessCode(): Observable<string> {
        return this.http.post<string>(`${this.apiUrl}`, {});
    }

    validateAccessCode(code: string): Observable<{ isValid: boolean }> {
        return this.http.get<{ isValid: boolean }>(`${this.apiUrl}/${code}/validate`);
    }

    removeAccessCode(code: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${code}`);
    }
}
