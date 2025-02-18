import { Injectable } from '@angular/core';
import { SocketClientService } from './socket/socket-client-service';

@Injectable({
    providedIn: 'root',
})
export class RoomValidationService {
    constructor(private readonly socketClientService: SocketClientService) {}

    validateCode(code: string) {
        this.isAccessCodeValid(code);
        this.isGameUnlock();
    }

    private isGameUnlock(): boolean {
        return true;
    }

    private isAccessCodeValid(code: string): boolean {
        if (code) {
            return true;
        }
        return true;
    }
}
