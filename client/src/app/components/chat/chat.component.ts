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

    constructor(private socketService: SocketClientService) {}

    ngOnInit(): void {
        this.socketService.onMessage((message: string) => {
            this.messages.push(message);
        });
    }

    sendMessage(): void {
        this.socketService.sendMessage(this.message); // Envoyer le message
        this.message = ''; // Réinitialiser le champ de saisie
    }

    ngOnDestroy(): void {
        // Nettoyer les écouteurs d'événements si nécessaire
    }
}
