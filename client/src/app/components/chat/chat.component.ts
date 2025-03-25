import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from '@app/services/message/message.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
})
export class ChatComponent {
    newMessage: string = '';
    messages$: Observable<string[]>;

    constructor(private messageService: MessageService) {
        this.messages$ = this.messageService.messages$;
    }

    sendMessage() {
        if (this.newMessage.trim()) {
            this.messageService.addMessage(this.newMessage);
            this.messageService.emitMessage(this.newMessage);
            this.newMessage = '';
        }
    }
}
