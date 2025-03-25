/* eslint-disable @typescript-eslint/member-ordering */
// disabled, car l'ordre n'est pas possible à respecter, car les subject doivent etre defini avant d'etre utilisé...

import { Injectable } from '@angular/core';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class MessageService {
    private messagesSubject = new BehaviorSubject<string[]>([]);
    messages$ = this.messagesSubject.asObservable();
    private accessCode: string | null;

    constructor(
        private readonly socketClientService: SocketClientService,
        private readonly lobbyService: LobbyService,
    ) {
        this.lobbyService.accessCode.subscribe((code) => {
            this.accessCode = code;
        });

        this.socketClientService.on('newMessage', (message: string) => {
            this.addMessage(message);
        });
    }

    emitMessage(message: string) {
        this.socketClientService.emit('messageSent', { message, accessCode: this.accessCode });
        this.addMessage(message);
    }

    setAccessCode(code: string) {
        this.accessCode = code;
    }

    addMessage(message: string) {
        const updatedMessages = [...this.messagesSubject.value, message];
        this.messagesSubject.next(updatedMessages);
    }
}
