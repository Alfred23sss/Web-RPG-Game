import { Injectable } from '@angular/core';
import { ChatEvents } from '@app/enums/global.enums';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class MessageService {
    private messagesSubject = new BehaviorSubject<string[]>([]);
    private accessCode: string | null = null;

    constructor(
        private readonly socketClientService: SocketClientService,
        private readonly accessCodeService: AccessCodeService,
        private readonly snackbarService: SnackbarService,
    ) {
        this.socketClientService.on(ChatEvents.RoomMessage, (message: string) => {
            this.addMessage(message);
        });

        this.socketClientService.on(ChatEvents.Error, (message: string) => {
            this.snackbarService.showMessage(message);
        });
    }

    get messages$(): Observable<string[]> {
        return this.messagesSubject.asObservable();
    }

    updateMessages(messages: string[]): void {
        this.messagesSubject.next(messages);
    }

    updateAccessCode() {
        this.accessCode = this.accessCodeService.getAccessCode();
        if (this.accessCode) {
            this.socketClientService.emit(ChatEvents.JoinRoom, { room: this.accessCode });
        }
    }

    emitMessage(message: string) {
        if (!this.accessCode) return;
        this.socketClientService.emit(ChatEvents.RoomMessage, { message, room: this.accessCode });
        this.addMessage(`You: ${message}`);
    }

    private addMessage(message: string) {
        const updatedMessages = [...this.messagesSubject.value, message];
        this.messagesSubject.next(updatedMessages);
    }
}
