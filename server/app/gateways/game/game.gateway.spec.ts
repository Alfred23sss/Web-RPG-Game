import { DiceType } from '@app/interfaces/Dice';
import { Player } from '@app/interfaces/Player';
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
    let gameSessionServiceMock: Partial<GameSessionService>;
    let lobbyServiceMock: Partial<LobbyService>;
    let loggerMock: Partial<Logger>;

    const mockPlayer: Player = {
        name: 'test-player',
        avatar: 'avatar.png',
        speed: 5,
        attack: { value: 4, bonusDice: DiceType.D6 },
        defense: { value: 4, bonusDice: DiceType.D4 },
        hp: { current: 10, max: 10 },
        movementPoints: 3,
        actionPoints: 3,
        inventory: [null, null],
        isAdmin: false,
        hasAbandoned: false,
        isActive: false,
        combatWon: 0,
        vitality: 0,
    };

    beforeEach(async () => {
        serverMock = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        gameSessionServiceMock = {
            createGameSession: jest.fn().mockReturnValue({
                turn: { orderedPlayers: [] },
                game: {},
            }),
            handlePlayerAbandoned: jest.fn().mockReturnValue(mockPlayer),
            endTurn: jest.fn(),
            deleteGameSession: jest.fn(),
        };

        lobbyServiceMock = {
            getLobby: jest.fn().mockReturnValue({ players: [mockPlayer, mockPlayer, mockPlayer] }),
            leaveLobby: jest.fn(),
            clearLobby: jest.fn(),
        };

        loggerMock = {
            log: jest.fn(),
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
                { provide: Logger, useValue: loggerMock },
                { provide: LobbyService, useValue: lobbyServiceMock },
                { provide: GameSessionService, useValue: gameSessionServiceMock },
            ],
        }).compile();

        gateway = module.get<GameGateway>(GameGateway);
        gateway.server = serverMock as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleCreateGame', () => {
        it('should create game session and emit gameStarted event', () => {
            const payload = { accessCode: 'test123', grid: [[]] };
            const mockClient = {
                id: 'socket1',
                join: jest.fn(),
                leave: jest.fn(),
                emit: jest.fn(),
            } as Partial<Socket> as Socket;

            gateway.handleCreateGame(mockClient, payload);

            expect(gameSessionServiceMock.createGameSession).toHaveBeenCalledWith('test123');
            expect(serverMock.to).toHaveBeenCalledWith('test123');
            expect(serverMock.emit).toHaveBeenCalledWith('gameStarted', {
                orderedPlayers: [],
                updatedGame: {},
            });
        });
    });

    describe('handleGameAbandoned', () => {
        it('should handle player abandonment and emit events when >2 players remain', () => {
            const payload = { player: mockPlayer, accessCode: 'test123' };
            const mockClient = {
                id: 'socket1',
                join: jest.fn(),
                leave: jest.fn(),
                emit: jest.fn(),
            } as Partial<Socket> as Socket;

            gateway.handleGameAbandoned(mockClient, payload);

            expect(gameSessionServiceMock.handlePlayerAbandoned).toHaveBeenCalledWith('test123', 'test-player');
            expect(serverMock.emit).toHaveBeenCalledWith('game-abandoned', { player: mockPlayer });
            expect(lobbyServiceMock.leaveLobby).not.toHaveBeenCalled();
        });

        it('should clear lobby and delete session when <=2 players remain', () => {
            lobbyServiceMock.getLobby = jest.fn().mockReturnValue({ players: [mockPlayer] });
            const payload = { player: mockPlayer, accessCode: 'test123' };
            const mockClient = {
                id: 'socket1',
                join: jest.fn(),
                leave: jest.fn(),
                emit: jest.fn(),
            } as Partial<Socket> as Socket;

            gateway.handleGameAbandoned(mockClient, payload);

            expect(lobbyServiceMock.leaveLobby).toHaveBeenCalledWith('test123', 'test-player');
            expect(lobbyServiceMock.clearLobby).toHaveBeenCalledWith('test123');
            expect(gameSessionServiceMock.deleteGameSession).toHaveBeenCalledWith('test123');
            expect(serverMock.emit).toHaveBeenCalledWith('gameDeleted');
        });
    });

    describe('handleEndTurn', () => {
        it('should call endTurn on gameSessionService', () => {
            const payload = { accessCode: 'test123' };
            const mockClient = {} as Socket;

            gateway.handleEndTurn(mockClient, payload);

            expect(gameSessionServiceMock.endTurn).toHaveBeenCalledWith('test123');
            expect(loggerMock.log).toHaveBeenCalledWith('Ending turn for game test123');
        });
    });

    describe('Event Handlers', () => {
        it('should handle transition started event', () => {
            const payload = { accessCode: 'test123', nextPlayer: mockPlayer };

            gateway.handleTransitionStarted(payload);

            expect(serverMock.emit).toHaveBeenCalledWith('transitionStarted', {
                nextPlayer: mockPlayer,
                transitionDuration: 3,
            });
        });

        it('should handle transition countdown event', () => {
            const payload = { accessCode: 'test123', countdown: 2 };

            gateway.handleTransitionCountdown(payload);

            expect(serverMock.emit).toHaveBeenCalledWith('transitionCountdown', {
                countdown: 2,
            });
        });

        it('should handle turn started event', () => {
            const payload = { accessCode: 'test123', player: mockPlayer };

            gateway.handleTurnStarted(payload);

            expect(serverMock.emit).toHaveBeenCalledWith('turnStarted', {
                player: mockPlayer,
                turnDuration: 30,
            });
        });

        it('should handle timer update event', () => {
            const payload = { accessCode: 'test123', timeLeft: 15 };

            gateway.handleTimerUpdate(payload);

            expect(serverMock.emit).toHaveBeenCalledWith('timerUpdate', {
                timeLeft: 15,
            });
        });
    });
});
