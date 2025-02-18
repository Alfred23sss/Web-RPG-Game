/* eslint-disable @angular-eslint/no-empty-lifecycle-method */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

    constructor(private socketService: SocketClientService) {
        this.id = socketService.getSocketId();
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
        this.socketService.sendMessageToOthers(this.message);
        this.messagesSent.push(this.message);
        this.message = '';
    }

    ngOnDestroy(): void {
        // Nettoyer les écouteurs d'événements si nécessaire
    }
}
