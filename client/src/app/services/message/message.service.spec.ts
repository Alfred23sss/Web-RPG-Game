import { TestBed } from '@angular/core/testing';
import { ChatEvents } from '@app/enums/global.enums';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject } from 'rxjs';
import { MessageService } from './message.service';

interface RoomMessageData {
    message: string;
}

describe('MessageService', () => {
    let service: MessageService;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;
    let accessCodeServiceSpy: jasmine.SpyObj<AccessCodeService>;

    beforeEach(() => {
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['on', 'emit']);
        const accessCodeSpy = jasmine.createSpyObj('AccessCodeService', ['getAccessCode']);

        TestBed.configureTestingModule({
            providers: [
                MessageService,
                { provide: SocketClientService, useValue: socketSpy },
                { provide: AccessCodeService, useValue: accessCodeSpy },
            ],
        });

        service = TestBed.inject(MessageService);
        socketClientServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        accessCodeServiceSpy = TestBed.inject(AccessCodeService) as jasmine.SpyObj<AccessCodeService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add message when RoomMessage event is received', () => {
        const initialMessages: string[] = [];
        service['messagesSubject'] = new BehaviorSubject<string[]>(initialMessages);
        const messageData: RoomMessageData = { message: 'Test message' };

        (socketClientServiceSpy.on as jasmine.Spy)
            .withArgs(ChatEvents.RoomMessage, jasmine.any(Function))
            .and.callFake((event: string, callback: (data: RoomMessageData) => void) => {
                if (event === ChatEvents.RoomMessage) {
                    callback(messageData);
                }
            });

        service['socketClientService'].on<RoomMessageData>(ChatEvents.RoomMessage, (data: RoomMessageData) => {
            service['addMessage'](data.message);
        });

        expect(service['messagesSubject'].value).toEqual([messageData.message]);
    });

    it('should update messages', () => {
        const newMessages = ['Message 1', 'Message 2'];
        service.updateMessages(newMessages);
        service.messages$.subscribe((messages) => {
            expect(messages).toEqual(newMessages);
        });
    });

    it('should add message when RoomMessage event is received', () => {
        const eventHandler = socketClientServiceSpy.on.calls.mostRecent().args[1] as (message: string) => void;

        const testMessage = 'Test message';
        eventHandler(testMessage);

        service.messages$.subscribe((messages) => {
            expect(messages).toContain(testMessage);
        });
    });

    it('should update access code and clear messages if access code changes', () => {
        accessCodeServiceSpy.getAccessCode.and.returnValue('newCode');
        service['accessCode'] = 'oldCode';
        service.updateAccessCode();
        service.messages$.subscribe((messages) => {
            expect(messages).toEqual([]);
        });

        expect(service['accessCode']).toBe('newCode');
    });

    it('should reset messages when access code changes', () => {
        accessCodeServiceSpy.getAccessCode.and.returnValue('initialCode');
        service.updateAccessCode();

        const testMessage = 'Test message';
        const eventHandler = socketClientServiceSpy.on.calls.mostRecent().args[1] as (message: string) => void;
        eventHandler(testMessage);

        accessCodeServiceSpy.getAccessCode.and.returnValue('newCode');
        service.updateAccessCode();

        service.messages$.subscribe((messages) => {
            expect(messages).toEqual([]);
        });
    });

    it('should not clear messages on first use', () => {
        accessCodeServiceSpy.getAccessCode.and.returnValue('initialCode');
        service.updateAccessCode();
        expect(service['accessCode']).toBe('initialCode');
        expect(service['firstUse']).toBe(false);
    });

    it('should emit message with access code', () => {
        const message = 'Test message';
        const author = 'Test author';
        service['accessCode'] = 'testRoom';
        service.emitMessage(message, author);
        expect(socketClientServiceSpy.emit).toHaveBeenCalledWith(ChatEvents.RoomMessage, {
            message,
            author,
            room: 'testRoom',
        });
    });

    it('should not emit message if access code is null', () => {
        service['accessCode'] = null;
        service.emitMessage('Test', 'Test');
        expect(socketClientServiceSpy.emit).not.toHaveBeenCalled();
    });

    it('should add a message to the messagesSubject', () => {
        const message = 'Test message';
        const initialMessages = ['initial'];
        service['messagesSubject'] = new BehaviorSubject<string[]>(initialMessages);

        service['addMessage'](message);

        expect(service['messagesSubject'].value).toEqual([...initialMessages, message]);
    });
});
