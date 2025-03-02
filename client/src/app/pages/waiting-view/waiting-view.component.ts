import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { DiceType, Routes } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { RoomValidationService } from '@app/services/room-validation/room-validation.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
    imports: [ChatComponent],
})
export class WaitingViewComponent implements OnInit, OnDestroy {
    accessCode: string;
    player: Player;
    waitingLine: Player[] = [];

    constructor(
        private router: Router,
        private readonly socketClientService: SocketClientService,
        private readonly roomValidationService: RoomValidationService,
        private readonly accessCodeCommunicationService: AccessCodesCommunicationService,
    ) {}

    ngOnInit(): void {
        this.accessCode = this.roomValidationService.currentAccessCode;
        this.socketClientService.createRoom(this.accessCode);

        this.player = {
            playerInfo: {
                name: 'default',
                avatar: 'default-avatar.png',
                speed: 5,
                vitality: 10,
                attack: { value: 3, bonusDice: DiceType.D6 },
                defense: { value: 2, bonusDice: DiceType.D6 },
                hp: { current: 10, max: 10 },
                movementPoints: 3,
                actionPoints: 2,
                inventory: [null, null],
                isAdmin: true,
            },
        };

        this.socketClientService.addToWaitingLine(this.player);

        this.socketClientService.onWaitingLineUpdated((waitingLine: Player[]) => {
            this.waitingLine = waitingLine;
            console.log('Waiting line updated:', this.waitingLine);
        });

        this.socketClientService.onGameDeleted((message: string) => {
            console.log(message);
            this.router.navigate([Routes.HomePage]);
        });
    }

    ngOnDestroy(): void {
        if (this.player.playerInfo.isAdmin) {
            this.socketClientService.deleteRoom(this.accessCode);

            this.accessCodeCommunicationService.deleteAccessCode(this.accessCode).subscribe({
                next: () => {
                    console.log(`Access code ${this.accessCode} deleted successfully`);
                },
                error: (err) => {
                    console.error(`Failed to delete access code ${this.accessCode}:`, err);
                },
            });
        }

        this.socketClientService.removeFromWaitingLine(this.player.playerInfo.name);
        this.socketClientService.leaveRoom(this.accessCode);
    }
    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }
}
