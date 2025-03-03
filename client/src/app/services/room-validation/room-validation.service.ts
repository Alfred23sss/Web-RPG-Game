import { Injectable } from '@angular/core';
import { ACCESS_CODE_MIN_VALUE, ACCESS_CODE_RANGE } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Injectable({
    providedIn: 'root',
})
export class RoomValidationService {
    currentAccessCode: string = '';
    private accessCodes: string[] = [];

    constructor(
        private readonly accessCodeCommunication: AccessCodesCommunicationService,
        private readonly socketClientService: SocketClientService,
    ) {
        this.loadAccessCodes();
    }

    validateCode(code: string): boolean {
        if (!this.containsCode(code)) {
            return false;
        }
        this.isGameUnlock();
        this.currentAccessCode = code;
        return true;
    }

    createCode(code: string) {
        this.postAccessCode(code);
    }

    generateAccessCode(): void {
        this.currentAccessCode = Math.floor(ACCESS_CODE_MIN_VALUE + Math.random() * ACCESS_CODE_RANGE).toString();

        if (this.containsCode(this.currentAccessCode)) {
            this.generateAccessCode();
        } else {
            this.accessCodes.push(this.currentAccessCode);
        }
    }

    joinGame(game: Game, player: Player): void {
        if (this.isCreating(game)) {
            this.generateAccessCode();
            this.postAccessCode(this.currentAccessCode);
        }
        this.socketClientService.joinLobby(this.currentAccessCode, player);
        // this.validateCode(this.currentAccessCode); //on aura surement besoin de le mettre assurer pas trop de joeur qui rentre
        this.loadAccessCodes();
    }

    isCreating(game: Game): boolean {
        return game !== undefined;
    }

    loadAccessCodes(): void {
        this.accessCodeCommunication.getAccessCodes().subscribe({
            next: (codes) => (this.accessCodes = codes.map((c) => c.code)),
        });
    }

    private isGameUnlock(): boolean {
        // Add logic if needed
        return true;
    }

    private containsCode(code: string): boolean {
        return this.accessCodes.includes(code);
    }

    private postAccessCode(code: string): void {
        this.accessCodeCommunication.createAccessCode(code).subscribe({
            next: () => {
                this.socketClientService.createLobby(code);
            },
        });
    }
}
