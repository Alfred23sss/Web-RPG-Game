import { Injectable } from '@angular/core';
import { SocketClientService } from '@app/services/socket/socket-client-service';

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
        return true;
    }
}
