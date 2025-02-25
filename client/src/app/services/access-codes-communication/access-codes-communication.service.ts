import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface AccessCode {
    code: string;
}

@Injectable({
    providedIn: 'root',
})
export class AccessCodesCommunicationService {
    private apiUrl = 'http://localhost:3000/api/accessCodes';

    constructor(private readonly http: HttpClient) {}

    getAccessCodes(): Observable<AccessCode[]> {
        return this.http.get<AccessCode[]>(this.apiUrl);
    }

    createAccessCode(code: string): Observable<AccessCode> {
        return this.http.post<AccessCode>(`${this.apiUrl}/create`, { code });
    }
}
