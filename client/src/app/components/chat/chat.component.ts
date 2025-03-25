import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from '@app/services/message/message.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnDestroy {
    newMessage: string = '';
    messages: string[];
    private messageSubscription: Subscription;

    constructor(private messageService: MessageService) {
        this.messageSubscription = this.messageService.messages$.subscribe((messages) => {
            this.messages = messages;
        });
        this.messageService.updateAccessCode();
    }

    sendMessage() {
        if (this.newMessage.trim()) {
            this.messageService.emitMessage(this.newMessage);
            this.newMessage = '';
        }
    }

    ngOnDestroy(): void {
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
        }
    }
}
