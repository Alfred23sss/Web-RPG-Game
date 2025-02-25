import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class RoomValidationService {
    // constructor(private readonly socketClientService: SocketClientService) {}
    currentAcessCode: string = '';

    validateCode(code: string) {
        this.isAccessCodeValid(code);
        this.isGameUnlock();
        this.currentAcessCode = code;
    }

    private isGameUnlock(): boolean {
        return true;
    }

    private isAccessCodeValid(code: string): boolean {
        return true;
    }
}
