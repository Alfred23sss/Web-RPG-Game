import { Injectable } from '@angular/core';
import { ChatEvents } from '@app/enums/global.enums';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class MessageService {
    private messagesSubject = new BehaviorSubject<string[]>([]);
    private accessCode: string | null = null;
    private firstUse = true;

    constructor(
        private readonly socketClientService: SocketClientService,
        private readonly accessCodeService: AccessCodeService,
    ) {
        this.socketClientService.on(ChatEvents.RoomMessage, (message: string) => {
            this.addMessage(message);
        });
    }

    get messages$(): Observable<string[]> {
        return this.messagesSubject.asObservable();
    }

    updateMessages(messages: string[]): void {
        this.messagesSubject.next(messages);
    }

    updateAccessCode() {
        const updateAccessCode = this.accessCodeService.getAccessCode();
        if (this.firstUse) {
            this.firstUse = false;
            this.accessCode = updateAccessCode;
            return;
        }
        if (updateAccessCode !== this.accessCode) {
            this.accessCode = updateAccessCode;
            this.messagesSubject.next([]);
        }
    }

    emitMessage(message: string, author: string) {
        if (!this.accessCode) {
            return;
        }
        this.socketClientService.emit(ChatEvents.RoomMessage, { message, author, room: this.accessCode });
    }

    private addMessage(message: string) {
        const updatedMessages = [...this.messagesSubject.value, message];
        this.messagesSubject.next(updatedMessages);
    }
}
