/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */
import { Player } from '@app/interfaces/player';
import { Game } from '@app/model/database/game';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { LobbyGateway } from './lobby.gateway';

fdescribe('LobbyGateway', () => {
    let gateway: LobbyGateway;
    let lobbyService: LobbyService;
    let accessCodesService: AccessCodesService;
    let gameSessionService: GameSessionService;
    let gameCombatService: GameCombatService;

    const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        sockets: {
            sockets: new Map(),
        },
    } as unknown as Server;

    const mockClient = {
        id: 'test-socket-id',
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
    } as unknown as Socket;

    const mockAccessCode = 'TEST123';
    const mockGame: Game = { id: '1', name: 'Test Game' } as Game;
    const mockPlayer: Player = {
        name: 'TestPlayer',
        avatar: 'TestAvatar',
        socketId: 'test-socket-id',
    } as unknown as Player;

    const mockLobby = {
        accessCode: mockAccessCode,
        game: mockGame,
        players: [mockPlayer],
        waitingPlayers: [],
        maxPlayers: 4,
        isLocked: false,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyGateway,
                {
                    provide: LobbyService,
                    useValue: {
                        createLobby: jest.fn().mockReturnValue(mockAccessCode),
                        getLobby: jest.fn().mockReturnValue(mockLobby),
                        getLobbyPlayers: jest.fn().mockReturnValue([mockPlayer]),
                        joinLobby: jest.fn().mockReturnValue({ success: true }),
                        leaveLobby: jest.fn(),
                        addPlayerToRoom: jest.fn(),
                        getRoomForPlayer: jest.fn().mockReturnValue(mockAccessCode),
                        getPlayerBySocketId: jest.fn().mockReturnValue(mockPlayer),
                        removePlayerSocket: jest.fn(),
                        setPlayerSocket: jest.fn(),
                        getPlayerSocket: jest.fn().mockReturnValue('test-socket-id'),
                        isAdminLeaving: jest.fn(),
                        getLobbyIdByPlayer: jest.fn(),
                        clearLobby: jest.fn(),
                    },
                },
                {
                    provide: Logger,
                    useValue: {
                        log: jest.fn(),
                    },
                },
                {
                    provide: AccessCodesService,
                    useValue: {
                        removeAccessCode: jest.fn(),
                    },
                },
                {
                    provide: GameSessionService,
                    useValue: {
                        getGameSession: jest.fn(),
                        getPlayers: jest.fn().mockReturnValue([mockPlayer]),
                        handlePlayerItemReset: jest.fn(),
                        handlePlayerAbandoned: jest.fn(),
                        deleteGameSession: jest.fn(),
                    },
                },
                {
                    provide: GameCombatService,
                    useValue: {
                        handleCombatSessionAbandon: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<LobbyGateway>(LobbyGateway);
        lobbyService = module.get<LobbyService>(LobbyService);
        accessCodesService = module.get<AccessCodesService>(AccessCodesService);
        gameSessionService = module.get<GameSessionService>(GameSessionService);
        gameCombatService = module.get<GameCombatService>(GameCombatService);

        gateway.server = mockServer;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleCreateLobby', () => {
        it('should create a lobby and emit lobbyCreated event', () => {
            gateway.handleCreateLobby({ game: mockGame }, mockClient);

            expect(lobbyService.createLobby).toHaveBeenCalledWith(mockGame);
            expect(mockClient.join).toHaveBeenCalledWith(mockAccessCode);
            expect(lobbyService.addPlayerToRoom).toHaveBeenCalledWith(mockClient.id, mockAccessCode);
            expect(mockClient.emit).toHaveBeenCalledWith('lobbyCreated', { accessCode: mockAccessCode });
        });
    });

    describe('handleJoinLobby', () => {
        it('should allow a player to join a lobby and emit events', () => {
            gateway.handleJoinLobby({ accessCode: mockAccessCode, player: mockPlayer }, mockClient);

            expect(lobbyService.getLobby).toHaveBeenCalledWith(mockAccessCode);
            expect(lobbyService.joinLobby).toHaveBeenCalledWith(mockAccessCode, mockPlayer);
            expect(mockClient.join).toHaveBeenCalledWith(mockAccessCode);
            expect(lobbyService.setPlayerSocket).toHaveBeenCalledWith(mockPlayer.name, mockClient.id);
            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', [mockPlayer]);
            expect(mockClient.emit).toHaveBeenCalledWith('joinedLobby');
        });

        it('should emit error if lobby not found', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(null);

            gateway.handleJoinLobby({ accessCode: 'INVALID', player: mockPlayer }, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Invalid access code');
            expect(lobbyService.joinLobby).not.toHaveBeenCalled();
        });

        it('should emit error if lobby is locked', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce({
                ...mockLobby,
                isLocked: true,
            });

            gateway.handleJoinLobby({ accessCode: mockAccessCode, player: mockPlayer }, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('joinError', 'Lobby is locked and cannot be joined');
            expect(lobbyService.joinLobby).not.toHaveBeenCalled();
        });

        it('should emit joinError if joining fails', () => {
            jest.spyOn(lobbyService, 'joinLobby').mockReturnValueOnce({ success: false });

            gateway.handleJoinLobby({ accessCode: mockAccessCode, player: mockPlayer }, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('joinError', 'Unable to join lobby');
        });

        it('should emit lobbyLocked if lobby becomes full after join', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce({
                ...mockLobby,
                players: Array(4).fill(mockPlayer),
                maxPlayers: 4,
            });

            gateway.handleJoinLobby({ accessCode: mockAccessCode, player: mockPlayer }, mockClient);

            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', { accessCode: mockAccessCode, isLocked: true });
        });
    });

    describe('handleJoinRoom', () => {
        it('should allow a socket to join a room', () => {
            gateway.handleJoinRoom(mockAccessCode, mockClient);

            expect(lobbyService.getLobby).toHaveBeenCalledWith(mockAccessCode);
            expect(lobbyService.addPlayerToRoom).toHaveBeenCalledWith(mockClient.id, mockAccessCode);
            expect(mockClient.join).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.to).toHaveBeenCalledWith(mockClient.id);
            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: ['TestAvatar'] });
        });

        it('should emit error if lobby not found', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(null);

            gateway.handleJoinRoom('INVALID', mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
            expect(mockClient.join).not.toHaveBeenCalled();
        });
    });

    describe('handleKickPlayer', () => {
        beforeEach(() => {
            mockServer.sockets.sockets.set('test-socket-id', mockClient);
        });

        it('should kick a player from the lobby', () => {
            gateway.handleKickPlayer({ accessCode: mockAccessCode, playerName: 'TestPlayer' });

            expect(lobbyService.getPlayerSocket).toHaveBeenCalledWith('TestPlayer');
            expect(mockServer.to).toHaveBeenCalledWith('test-socket-id');
            expect(mockServer.emit).toHaveBeenCalledWith('kicked', {
                accessCode: mockAccessCode,
                playerName: 'TestPlayer',
            });
            expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith('TestPlayer');
        });
    });

    describe('handleGetLobbyPlayers', () => {
        it('should emit players list for valid lobby', () => {
            gateway.handleGetLobbyPlayers(mockAccessCode, mockClient);

            expect(lobbyService.getLobbyPlayers).toHaveBeenCalledWith(mockAccessCode);
            expect(mockClient.emit).toHaveBeenCalledWith('updatePlayers', [mockPlayer]);
        });

        it('should emit error if lobby not found', () => {
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValueOnce(null);

            gateway.handleGetLobbyPlayers('INVALID', mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleGetLobby', () => {
        it('should emit lobby data for valid lobby', () => {
            gateway.handleGetLobby(mockAccessCode, mockClient);

            expect(lobbyService.getLobby).toHaveBeenCalledWith(mockAccessCode);
            expect(mockClient.emit).toHaveBeenCalledWith('updateLobby', mockLobby);
        });

        it('should emit error if lobby not found', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(null);

            gateway.handleGetLobby('INVALID', mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleLockLobby', () => {
        it('should lock a lobby and emit event', () => {
            const mockLobbyWithLockFlag = { ...mockLobby, isLocked: false };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(mockLobbyWithLockFlag);

            gateway.handleLockLobby(mockAccessCode, mockClient);

            expect(mockLobbyWithLockFlag.isLocked).toBe(true);
            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', {
                accessCode: mockAccessCode,
                isLocked: true,
            });
        });

        it('should emit error if lobby not found', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(null);

            gateway.handleLockLobby('INVALID', mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleUnlockLobby', () => {
        it('should unlock a lobby and emit event', () => {
            const mockLockedLobby = { ...mockLobby, isLocked: true };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(mockLockedLobby);

            gateway.handleUnlockLobby(mockAccessCode, mockClient);

            expect(mockLockedLobby.isLocked).toBe(false);
            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('lobbyUnlocked', {
                accessCode: mockAccessCode,
                isLocked: false,
            });
        });

        it('should emit error if lobby not found', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(null);

            gateway.handleUnlockLobby('INVALID', mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });

        it('should emit error if trying to unlock a full lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce({
                ...mockLobby,
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                players: Array(4).fill(mockPlayer),
                maxPlayers: 4,
                isLocked: true,
            });

            gateway.handleUnlockLobby(mockAccessCode, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby is full and cannot be unlocked');
        });
    });

    describe('handleSelectAvatar', () => {
        it('should select an avatar and emit events', () => {
            const mockLobbyWithWaiting = {
                ...mockLobby,
                waitingPlayers: [],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(mockLobbyWithWaiting);

            gateway.handleSelectAvatar({ accessCode: mockAccessCode, avatar: 'NewAvatar' }, mockClient);

            expect(mockLobbyWithWaiting.waitingPlayers).toEqual([{ socketId: mockClient.id, avatar: 'NewAvatar' }]);

            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: ['TestAvatar', 'NewAvatar'],
            });

            expect(mockClient.emit).toHaveBeenCalledWith('avatarSelected', {
                avatar: 'NewAvatar',
            });
        });

        it('should emit error if avatar is already taken', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce({
                ...mockLobby,
                waitingPlayers: [],
            });

            gateway.handleSelectAvatar({ accessCode: mockAccessCode, avatar: 'TestAvatar' }, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Cet avatar est déjà pris !');
        });
    });

    describe('handleDeselectAvatar', () => {
        it('should deselect an avatar and emit events', () => {
            const mockLobbyWithSelectedAvatar = {
                ...mockLobby,
                waitingPlayers: [{ socketId: mockClient.id, avatar: 'NewAvatar' }],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(mockLobbyWithSelectedAvatar);

            gateway.handleDeselectAvatar(mockAccessCode, mockClient);

            expect(mockLobbyWithSelectedAvatar.waitingPlayers).toEqual([]);
            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: ['TestAvatar'],
            });
            expect(mockClient.emit).toHaveBeenCalledWith('avatarDeselected');
        });
    });

    describe('handleManualDisconnect', () => {
        it('should handle manual disconnect from lobby', () => {
            jest.spyOn(lobbyService, 'isAdminLeaving').mockReturnValueOnce(false);
            jest.spyOn(lobbyService, 'leaveLobby').mockReturnValueOnce(false);

            gateway.handleManualDisconnect(mockClient);

            expect(lobbyService.getRoomForPlayer).toHaveBeenCalledWith(mockClient.id);
            expect(lobbyService.getPlayerBySocketId).toHaveBeenCalledWith(mockClient.id);
            expect(lobbyService.leaveLobby).toHaveBeenCalledWith(mockAccessCode, mockPlayer.name);
            expect(mockClient.leave).toHaveBeenCalledWith(mockAccessCode);
            expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith(mockClient.id);
        });

        it('should handle manual disconnect from game', () => {
            jest.spyOn(gameSessionService, 'getGameSession').mockReturnValueOnce({
                game: new Game(),
                turn: undefined,
            });
            jest.spyOn(gameSessionService, 'getPlayers').mockReturnValueOnce([]);

            gateway.handleManualDisconnect(mockClient, { isInGame: true });

            expect(gameCombatService.handleCombatSessionAbandon).toHaveBeenCalledWith(mockAccessCode, mockPlayer.name);
            expect(gameSessionService.handlePlayerAbandoned).toHaveBeenCalledWith(mockAccessCode, mockPlayer.name);
            expect(lobbyService.leaveLobby).toHaveBeenCalledWith(mockAccessCode, mockPlayer.name, true);
            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('game-abandoned', { player: undefined });
        });
    });

    describe('handleConnection', () => {
        it('should handle new socket connection', () => {
            jest.spyOn(lobbyService, 'getLobbyIdByPlayer').mockReturnValueOnce(mockAccessCode);

            gateway.handleConnection(mockClient);

            expect(lobbyService.getLobbyIdByPlayer).toHaveBeenCalledWith(mockClient.id);
            expect(mockClient.join).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', [mockPlayer]);
        });
    });

    describe('handleDisconnect', () => {
        it('should handle socket disconnection', () => {
            jest.spyOn(lobbyService, 'isAdminLeaving').mockReturnValueOnce(false);
            jest.spyOn(lobbyService, 'leaveLobby').mockReturnValueOnce(false);

            gateway.handleDisconnect(mockClient);

            expect(lobbyService.getRoomForPlayer).toHaveBeenCalledWith(mockClient.id);
            expect(lobbyService.getPlayerBySocketId).toHaveBeenCalledWith(mockClient.id);
            expect(mockClient.leave).toHaveBeenCalledWith(mockAccessCode);
            expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith(mockClient.id);
        });
    });

    describe('handleRequestUnavailableOptions', () => {
        it('should emit unavailable avatars', () => {
            gateway.handleRequestUnavailableOptions(mockAccessCode, mockClient);

            expect(lobbyService.getLobby).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.to).toHaveBeenCalledWith(mockAccessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: ['TestAvatar'],
            });
            expect(mockClient.emit).toHaveBeenCalledWith('updateUnavailableOptions', ['TestAvatar']);
        });

        it('should emit error if lobby not found', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValueOnce(null);

            gateway.handleRequestUnavailableOptions('INVALID', mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });
});
