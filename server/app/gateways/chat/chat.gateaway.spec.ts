/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { ChatGateway } from './chat.gateaway';
import { ChatEvents } from './chat.gateaway.events';

jest.mock('socket.io');

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let mockServer: Server;
    let mockSocket: Socket;

    beforeEach(async () => {
        mockServer = new Server();
        mockSocket = {
            emit: jest.fn(),
            id: '1234',
            join: jest.fn(),
            leave: jest.fn(),
        } as unknown as Socket;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatGateway,
                {
                    provide: Logger,
                    useValue: { log: jest.fn() },
                },
            ],
        }).compile();

        gateway = module.get<ChatGateway>(ChatGateway);
        (gateway as any).server = mockServer;
    });

    it('should broadcast a message to all', () => {
        jest.spyOn(mockServer, 'emit');
        gateway.broadcastAll(mockSocket, 'test message');
        expect(mockServer.emit).toHaveBeenCalledWith(ChatEvents.MassMessage, '1234 : test message');
    });

    describe('validate', () => {
        it('should emit WordValidated false for short word', () => {
            const shortWord = 'a';
            gateway.validate(mockSocket, shortWord);

            expect(mockSocket.emit).toHaveBeenCalledWith(ChatEvents.WordValidated, false);
        });

        it('should handle undefined word', () => {
            gateway.validate(mockSocket, undefined);

            expect(mockSocket.emit).toHaveBeenCalledWith(ChatEvents.WordValidated, false);
        });
    });

    describe('validateWithAck', () => {
        it('should return isValid false for short word', () => {
            const shortWord = 'a';
            const result = gateway.validateWithAck(mockSocket, shortWord);

            expect(result).toEqual({ isValid: false });
        });

        it('should handle undefined word by returning false', () => {
            const result = gateway.validateWithAck(mockSocket, undefined);

            expect(result).toEqual({ isValid: false });
        });

        it('should return false for word with exact min length', () => {
            const exactLengthWord = 'abc';
            const result = gateway.validateWithAck(mockSocket, exactLengthWord);

            expect(result).toEqual({ isValid: false });
        });
    });

    it('should emit time periodically', () => {
        jest.useFakeTimers();
        jest.spyOn(gateway as any, 'emitTime');

        gateway.afterInit();
        jest.advanceTimersByTime(1000);

        expect((gateway as any).emitTime).toHaveBeenCalled();
        jest.useRealTimers();
    });

    describe('roomMessage', () => {
        let mockAdapter: any;

        beforeEach(() => {
            mockAdapter = {
                rooms: new Map(),
            };
            (mockServer as any).sockets = {
                adapter: mockAdapter,
            };
        });

        it('should log reception and emit error for invalid room', () => {
            const logger = gateway['logger'] as jest.Mocked<Logger>;
            const invalidPayload = { message: 'test', author: 'user', room: '' };

            gateway.roomMessage(mockSocket, invalidPayload);

            expect(logger.log).toHaveBeenCalledWith('recu dans chat');
            expect(mockSocket.emit).toHaveBeenCalledWith(ChatEvents.Error, 'Invalid room ID');
        });

        it('should log when room does not exist', () => {
            const logger = gateway['logger'] as jest.Mocked<Logger>;
            const payload = { message: 'test', author: 'user', room: 'nonexistent' };

            gateway.roomMessage(mockSocket, payload);

            expect(logger.log).toHaveBeenCalledWith('Message not received, not in the room');
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should send formatted message when room exists', () => {
            const logger = gateway['logger'] as jest.Mocked<Logger>;
            const roomName = 'existing-room';
            const payload = { message: 'test', author: 'user', room: roomName };
            mockAdapter.rooms.set(roomName, new Set());
            const mockEmit = jest.fn();
            (mockServer.to as jest.Mock).mockReturnValue({ emit: mockEmit });
            gateway.roomMessage(mockSocket, payload);
            expect(logger.log).toHaveBeenCalledWith('Message received, sending to the room');
            expect(mockServer.to).toHaveBeenCalledWith(roomName);
            expect(mockEmit).toHaveBeenCalled();
            const [event, message] = mockEmit.mock.calls[0];
            expect(event).toBe(ChatEvents.RoomMessage);
            expect(message).toContain('user: test -');
            expect(message).toMatch(/\d{2}:\d{2}:\d{2}/);
        });
    });
});
