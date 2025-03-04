import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class AccessCodeService {
    private accessCode: string = '';

    setAccessCode(code: string): void {
        this.accessCode = code;
    }

    getAccessCode(): string {
        return this.accessCode;
    }
}
