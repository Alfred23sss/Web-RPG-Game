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

    it('should emit time periodically', () => {
        jest.useFakeTimers();
        jest.spyOn(gateway as any, 'emitTime');

        gateway.afterInit();
        jest.advanceTimersByTime(1000);

        expect((gateway as any).emitTime).toHaveBeenCalled();
        jest.useRealTimers();
    });
});
