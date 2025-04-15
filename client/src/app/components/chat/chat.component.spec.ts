import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MessageService } from '@app/services/message/message.service';
import { of } from 'rxjs';
import { ChatComponent } from './chat.component';

describe('ChatComponent', () => {
    let component: ChatComponent;
    let fixture: ComponentFixture<ChatComponent>;
    let messageService: jasmine.SpyObj<MessageService>;

    beforeEach(() => {
        messageService = jasmine.createSpyObj('MessageService', ['emitMessage', 'updateAccessCode']);

        Object.defineProperty(messageService, 'messages$', {
            get: jasmine.createSpy().and.returnValue(of(['Hello', 'Hi there'])),
        });

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            providers: [{ provide: MessageService, useValue: messageService }],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should subscribe to messages from MessageService and update messages', () => {
        fixture.detectChanges();

        expect(component.messages).toEqual(['Hello', 'Hi there']);
    });

    it('should call emitMessage and reset newMessage when sendMessage is called with a valid message', () => {
        component.newMessage = 'Test Message';
        component.author = 'Test Author';

        component.sendMessage();

        expect(messageService.emitMessage).toHaveBeenCalledWith('Test Message', 'Test Author');

        expect(component.newMessage).toBe('');
    });

    it('should not call emitMessage when sendMessage is called with an empty message', () => {
        component.newMessage = '';
        component.author = 'Test Author';

        component.sendMessage();

        expect(messageService.emitMessage).not.toHaveBeenCalled();
    });

    describe('handleKeyDown', () => {
        let yourInstance: ChatComponent;

        beforeEach(() => {
            yourInstance = new ChatComponent(messageService);
        });

        it('should call sendMessage when "Enter" is pressed and shiftKey is not pressed', () => {
            const sendMessageSpy = spyOn(yourInstance, 'sendMessage');
            const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });

            yourInstance.handleKeyDown(event);

            expect(sendMessageSpy).toHaveBeenCalledTimes(1);
        });

        it('should not call sendMessage when "Enter" is pressed with shiftKey', () => {
            const sendMessageSpy = spyOn(yourInstance, 'sendMessage');
            const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

            yourInstance.handleKeyDown(event);

            expect(sendMessageSpy).not.toHaveBeenCalled();
        });

        it('should not call sendMessage when a key other than "Enter" is pressed', () => {
            const sendMessageSpy = spyOn(yourInstance, 'sendMessage');
            const event = new KeyboardEvent('keydown', { key: 'a', shiftKey: false });

            yourInstance.handleKeyDown(event);

            expect(sendMessageSpy).not.toHaveBeenCalled();
        });
    });
});
