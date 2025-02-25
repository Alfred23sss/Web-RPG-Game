/* eslint-disable @angular-eslint/no-empty-lifecycle-method */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoomValidationService } from '@app/services/room-validation/room-validation.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss'],
    imports: [FormsModule],
})
export class ChatComponent implements OnInit, OnDestroy {
    message: string = '';
    messages: string[] = [];
    messagesSent: string[] = [];
    id: string | undefined;
    room: string = 'default-room';

    constructor(
        private socketService: SocketClientService,
        private roomValidationService: RoomValidationService,
    ) {
        this.id = socketService.getSocketId();
        this.room = this.roomValidationService.currentAccessCode;
    }

    ngOnInit(): void {
        this.socketService.onMessage((message: string) => {
            this.messages.push(message);
        });
    }

    sendMessage(): void {
        this.socketService.sendMessage(this.message);
        this.messagesSent.push(this.message);
        this.message = '';
    }

    sendMessageToOthers(): void {
        this.socketService.sendMessageToOthers(this.message, this.room);
        this.messagesSent.push(this.message);
        this.message = '';
    }

    ngOnDestroy(): void {
        // Nettoyer les écouteurs d'événements si nécessaire
    }
}
