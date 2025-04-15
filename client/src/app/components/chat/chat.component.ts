import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
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
export class ChatComponent implements OnDestroy, AfterViewChecked {
    @Input() author: string = '';
    @ViewChild('messagesContent') private messagesContent!: ElementRef;
    newMessage: string = '';
    messages: string[];
    private messageSubscription: Subscription;

    constructor(private messageService: MessageService) {
        this.messageSubscription = this.messageService.messages$.subscribe((messages) => {
            this.messages = messages;
        });
        this.messageService.updateAccessCode();
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    sendMessage() {
        if (this.newMessage.trim()) {
            this.messageService.emitMessage(this.newMessage, this.author);
            this.newMessage = '';
        }
    }

    handleKeyDown(event: KeyboardEvent) {
        event.stopPropagation();

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    ngOnDestroy(): void {
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
        }
    }

    private scrollToBottom(): void {
        const container = this.messagesContent.nativeElement;
        container.scrollTop = container.scrollHeight;
    }
}
