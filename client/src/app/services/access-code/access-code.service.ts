import { Injectable } from '@angular/core';
import { Lobby } from '@app/interfaces/lobby';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Injectable({
    providedIn: 'root',
})
export class AccessCodeService {
    private accessCode: string = '';

    constructor(private readonly socketClientService: SocketClientService) {}
    setAccessCode(code: string): void {
        this.accessCode = code;
    }

    getAccessCode(): string {
        return this.accessCode;
    }

    async getLobbyData(accessCode: string): Promise<Lobby> {
        return new Promise((resolve, reject) => {
            this.socketClientService.getLobby(accessCode).subscribe({
                next: (lobby) => {
                    resolve(lobby);
                },
                error: (err) => {
                    reject(err);
                },
            });
        });
    }
}
