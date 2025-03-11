/* eslint-disable @typescript-eslint/no-explicit-any */
import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Namespace, Server, Socket } from 'socket.io';
import { LobbyGateway } from './lobby.gateway';

describe('LobbyGateway', () => {
    let gateway: LobbyGateway;
    let lobbyService: LobbyService;
    let logger: Logger;
    let mockServer: Partial<Server>;
    let mockSocket: Partial<Socket>;

    beforeEach(async () => {
        mockServer = {
            sockets: {
                adapter: {
                    rooms: new Map(),
                },
                sockets: new Map(),
                emit: jest.fn(),
                to: jest.fn().mockReturnThis(),
                on: jest.fn(),
                off: jest.fn(),
                use: jest.fn(),
                name: '',
                _preConnectSockets: new Set(),
                server: {} as any,
            } as unknown as Namespace,
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            on: jest.fn(),
            of: jest.fn().mockReturnValue({
                emit: jest.fn(),
                to: jest.fn().mockReturnThis(),
            }),
        } as unknown as Server;

        mockSocket = {
            id: 'test-socket-id',
            join: jest.fn(),
            emit: jest.fn(),
            leave: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyGateway,
                {
                    provide: LobbyService,
                    useValue: {
                        createLobby: jest.fn().mockReturnValue('TEST123'),
                        getLobby: jest.fn(),
                        joinLobby: jest.fn(),
                        leaveLobby: jest.fn(),
                        getLobbyPlayers: jest.fn(),
                        getLobbyIdByPlayer: jest.fn(),
                        getUnavailableNamesAndAvatars: jest.fn(),
                    },
                },
                {
                    provide: Logger,
                    useValue: {
                        log: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<LobbyGateway>(LobbyGateway);
        lobbyService = module.get<LobbyService>(LobbyService);
        logger = module.get<Logger>(Logger);
        gateway.server = mockServer as unknown as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleRequestUnavailableOptions', () => {
        it('should emit unavailable options when requested', () => {
            const testAccessCode = 'TEST123';
            const mockUnavailableOptions = { names: ['Name1'], avatars: ['Avatar1'] };
            lobbyService.getUnavailableNamesAndAvatars = jest.fn().mockReturnValue(mockUnavailableOptions);

            gateway.handleRequestUnavailableOptions(testAccessCode, mockSocket as Socket);

            expect(lobbyService.getUnavailableNamesAndAvatars).toHaveBeenCalledWith(testAccessCode);
            expect(mockSocket.emit).toHaveBeenCalledWith('updateUnavailableOptions', mockUnavailableOptions);
        });
    });

    describe('handleCreateLobby', () => {
        it('should create lobby and emit events', () => {
            const mockGame = { name: 'Test Game' } as Game;
            gateway.handleCreateLobby({ game: mockGame }, mockSocket as Socket);

            expect(lobbyService.createLobby).toHaveBeenCalledWith(mockGame);
            expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
            expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Test Game'));
            expect(mockSocket.emit).toHaveBeenCalledWith('lobbyCreated', { accessCode: 'TEST123' });
        });
    });

    describe('handleJoinLobby', () => {
        const mockPlayer = { name: 'Test Player', avatar: 'test-avatar' } as Player;

        it('should handle invalid access code', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleJoinLobby({ accessCode: 'INVALID', player: mockPlayer }, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Invalid access code');
        });

        it('should handle locked lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue({ isLocked: true } as any);

            gateway.handleJoinLobby({ accessCode: 'LOCKED', player: mockPlayer }, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('joinError', 'Lobby is locked and cannot be joined');
        });

        it('should successfully join lobby', () => {
            const mockLobby = {
                isLocked: false,
                maxPlayers: 4,
                players: [],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);
            jest.spyOn(lobbyService, 'joinLobby').mockReturnValue(true);
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([mockPlayer]);

            gateway.handleJoinLobby({ accessCode: 'TEST123', player: mockPlayer }, mockSocket as Socket);

            expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', expect.anything());
        });

        it('should not successfully join lobby', () => {
            const mockLobby = {
                isLocked: false,
                maxPlayers: 4,
                players: [],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);
            jest.spyOn(lobbyService, 'joinLobby').mockReturnValue(false);

            gateway.handleJoinLobby({ accessCode: 'TEST123', player: mockPlayer }, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('joinError', 'Unable to join lobby');
        });

        it('should lock lobby when full', () => {
            const mockLobby = {
                isLocked: false,
                maxPlayers: 1,
                players: [mockPlayer],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);
            jest.spyOn(lobbyService, 'joinLobby').mockReturnValue(true);

            gateway.handleJoinLobby({ accessCode: 'TEST123', player: mockPlayer }, mockSocket as Socket);

            expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', expect.anything());
        });
    });

    describe('handleDeleteLobby', () => {
        const mockPlayer = { name: 'Test Player', avatar: 'test-avatar' } as Player;
        const mockRoom = new Set(['socket1', 'socket2']);
        const mockLobby = {
            isLocked: false,
            maxPlayers: 1,
            players: [mockPlayer],
        };
        it('should delete lobby and clean up clients', () => {
            mockServer.sockets.adapter.rooms.set('TEST123', mockRoom);

            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);
            jest.spyOn(mockServer.sockets.sockets, 'get').mockReturnValue(mockSocket as any);

            gateway.handleDeleteLobby('TEST123', mockSocket as Socket);

            expect(mockServer.emit).toHaveBeenCalledWith('lobbyDeleted');
            expect(lobbyService.leaveLobby).toHaveBeenCalled();
        });

        it('should not delete lobby if lobby does not exist', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleDeleteLobby('TEST123', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby does not exist');
        });

        it('should not delete lobby if room socket does not exist', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);
            jest.spyOn(mockServer.sockets.adapter.rooms, 'get').mockReturnValue(undefined);

            gateway.handleDeleteLobby('TEST123', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby TEST123 does not exist.');
        });
    });

    describe('handleLeaveLobby', () => {
        it('should handle lobby deletion on leave', () => {
            jest.spyOn(lobbyService, 'leaveLobby').mockReturnValue(true);

            gateway.handleLeaveLobby({ accessCode: 'TEST123', playerName: 'Admin' }, mockSocket as Socket);

            expect(mockServer.emit).toHaveBeenCalledWith('lobbyDeleted');
        });

        it('should handle lobby update on leave', () => {
            jest.spyOn(lobbyService, 'leaveLobby').mockReturnValue(false);
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([]);
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue({ players: [], maxPlayers: 4 } as any);

            gateway.handleLeaveLobby({ accessCode: 'TEST123', playerName: 'Player' }, mockSocket as Socket);

            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', expect.anything());
        });
    });

    describe('handleGetLobbyPlayers', () => {
        it('should emit players list', () => {
            const mockPlayers = [{ name: 'Player 1' }];
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(mockPlayers as any);

            gateway.handleGetLobbyPlayers('TEST123', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('updatePlayers', mockPlayers);
        });
        it('should not emit players list', () => {
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(undefined);

            gateway.handleGetLobbyPlayers('TEST123', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleGetLobby', () => {
        it('should emit lobby data if exists', () => {
            const mockLobby = { accessCode: 'TEST123' };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleGetLobby('TEST123', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('updateLobby', mockLobby);
        });

        it('should handle missing lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleGetLobby('INVALID', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleLockLobby', () => {
        it('should lock existing lobby', () => {
            const mockLobby = { accessCode: 'TEST123', isLocked: false };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleLockLobby('TEST123', mockSocket as Socket);

            expect(mockLobby.isLocked).toBe(true);
            expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', expect.anything());
        });

        it('should not lock if lobby does not exist', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleLockLobby('TEST123', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleUnlockLobby', () => {
        it('should unlock valid lobby', () => {
            const mockLobby = {
                accessCode: 'TEST123',
                isLocked: true,
                players: [],
                maxPlayers: 4,
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleUnlockLobby('TEST123', mockSocket as Socket);

            expect(mockLobby.isLocked).toBe(false);
            expect(mockServer.emit).toHaveBeenCalledWith('lobbyUnlocked', expect.anything());
        });

        it('should prevent unlocking full lobby', () => {
            const mockLobby = {
                accessCode: 'TEST123',
                isLocked: true,
                players: [{}], // Non-empty array
                maxPlayers: 1,
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleUnlockLobby('TEST123', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby is full and cannot be unlocked');
        });

        it('should check if lobby exist', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleUnlockLobby('TEST123', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('Connection Handling', () => {
        it('should handle connection with existing lobby', () => {
            jest.spyOn(lobbyService, 'getLobbyIdByPlayer').mockReturnValue('TEST123');

            gateway.handleConnection(mockSocket as Socket);

            expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
        });

        it('should handle disconnection', () => {
            jest.spyOn(lobbyService, 'getLobbyIdByPlayer').mockReturnValue('TEST123');
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([]);

            gateway.handleDisconnect(mockSocket as Socket);

            expect(lobbyService.leaveLobby).toHaveBeenCalledWith('TEST123', 'test-socket-id');
            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', expect.anything());
        });
    });

    it('should log initialization', () => {
        gateway.afterInit();
        expect(logger.log).toHaveBeenCalledWith('LobbyGateway initialized.');
    });
});
