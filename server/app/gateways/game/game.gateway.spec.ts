import { GameManagerService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { GameGateway } from './game.gateway';

describe('GameGateway', () => {
    let gateway: GameGateway;
    let serverMock: Partial<Server>;

    beforeEach(async () => {
        serverMock = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameGateway,
                { provide: Logger, useValue: { log: jest.fn() } },
                { provide: LobbyService, useValue: { getLobby: jest.fn() } },
                {
                    provide: GameSessionService,
                    useValue: {
                        createGameSession: jest.fn().mockReturnValue({
                            turn: { orderedPlayers: [] },
                            game: {},
                        }),
                    },
                },
                { provide: GameManagerService, useValue: {} },
            ],
        }).compile();

        gateway = module.get<GameGateway>(GameGateway);
        gateway.server = serverMock as Server;
    });

    it('should emit gameStarted when handling CreateGame event', () => {
        const payload = { accessCode: 'test123', grid: [[]] };

        // Mock client as a Partial<Socket> to avoid missing property errors
        const mockClient = {
            id: 'socket1',
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
        } as Partial<Socket> as Socket;

        gateway.handleCreateGame(mockClient, payload);

        expect(serverMock.to).toHaveBeenCalledWith('test123');
        expect(serverMock.emit).toHaveBeenCalledWith('gameStarted', { orderedPlayers: [], updatedGame: {} });
    });
});
