/* eslint-disable max-lines */
import { Player } from '@app/interfaces/Player';
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

// /* eslint-disable max-lines */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { DiceType } from '@app/interfaces/Dice';
// import { Lobby } from '@app/interfaces/Lobby';
// import { Player } from '@app/interfaces/Player';
// import { Game } from '@app/model/database/game';
// import { LobbyService } from '@app/services/lobby/lobby.service';
// import { Logger } from '@nestjs/common';
// import { Test, TestingModule } from '@nestjs/testing';
// import { Namespace, Server, Socket } from 'socket.io';
// import { LobbyGateway } from './lobby.gateway';

// const TEST_ACCESS_CODE = 'test-code';
// const LOBBY_ACCESS_CODE = 'test-lobby';
// const TEST_PLAYER_NAME = 'test-player';
// const TEST_AVATAR = 'test-avatar';
// const TEST_SOCKET_ID = 'test-socket-id';
// const MOCK_GAME = { name: 'Test Game' } as Game;
// const CLIENT_SOCKET_ID = 'client-socket-id';
// const MOCK_PLAYER: Player = {
//     name: TEST_PLAYER_NAME,
//     avatar: TEST_AVATAR,
//     speed: 5,
//     attack: {
//         value: 4,
//         bonusDice: DiceType.D4,
//     },
//     defense: {
//         value: 4,
//         bonusDice: DiceType.D6,
//     },
//     hp: {
//         current: 10,
//         max: 10,
//     },
//     movementPoints: 0,
//     actionPoints: 0,
//     inventory: [null, null],
//     isAdmin: false,
//     hasAbandoned: false,
//     isActive: false,
//     combatWon: 0,
//     isVirtual: false,
// };
// const MOCK_WAITING_PLAYER = { socketId: 'socket2', avatar: 'avatar2' };
// const MOCK_LOBBY_LOCKED: Lobby = {
//     isLocked: false,
//     maxPlayers: 4,
//     players: [],
//     waitingPlayers: [],
//     accessCode: TEST_ACCESS_CODE,
//     game: MOCK_GAME,
// };
// const MOCK_LOBBY_UNLOCKED: Lobby = {
//     isLocked: false,
//     maxPlayers: 4,
//     players: [],
//     waitingPlayers: [MOCK_WAITING_PLAYER],
//     accessCode: TEST_ACCESS_CODE,
//     game: MOCK_GAME,
// };

// fdescribe('LobbyGateway', () => {
//     let gateway: LobbyGateway;
//     let lobbyService: LobbyService;
//     let logger: Logger;
//     let mockServer: Partial<Server>;
//     let mockSocket: Partial<Socket>;

//     beforeEach(async () => {
//         mockServer = {
//             sockets: {
//                 adapter: {
//                     rooms: new Map(),
//                 },
//                 sockets: new Map(),
//                 emit: jest.fn(),
//                 to: jest.fn().mockReturnThis(),
//                 on: jest.fn(),
//                 off: jest.fn(),
//                 use: jest.fn(),
//                 name: '',
//                 _preConnectSockets: new Set(),
//                 server: {} as any,
//             } as unknown as Namespace,
//             to: jest.fn().mockReturnThis(),
//             emit: jest.fn(),
//             on: jest.fn(),
//             of: jest.fn().mockReturnValue({
//                 emit: jest.fn(),
//                 to: jest.fn().mockReturnThis(),
//             }),
//         } as unknown as Server;

//         mockSocket = {
//             id: TEST_SOCKET_ID,
//             join: jest.fn(),
//             emit: jest.fn(),
//             leave: jest.fn(),
//         };

//         const module: TestingModule = await Test.createTestingModule({
//             providers: [
//                 LobbyGateway,
//                 {
//                     provide: LobbyService,
//                     useValue: {
//                         createLobby: jest.fn().mockReturnValue('TEST123'),
//                         getLobby: jest.fn(),
//                         joinLobby: jest.fn(),
//                         leaveLobby: jest.fn(),
//                         getLobbyPlayers: jest.fn(),
//                         getLobbyIdByPlayer: jest.fn(),
//                         getUnavailableNamesAndAvatars: jest.fn(),
//                         setPlayerSocket: jest.fn(),
//                         removePlayerSocket: jest.fn(),
//                         getPlayerSocket: jest.fn(),
//                         isAdminLeaving: jest.fn(),
//                         getPlayerBySocketId: jest.fn(),
//                     },
//                 },
//                 {
//                     provide: Logger,
//                     useValue: {
//                         log: jest.fn(),
//                     },
//                 },
//             ],
//         }).compile();

//         gateway = module.get<LobbyGateway>(LobbyGateway);
//         lobbyService = module.get<LobbyService>(LobbyService);
//         logger = module.get<Logger>(Logger);
//         gateway.server = mockServer as unknown as Server;
//     });

//     it('should be defined', () => {
//         expect(gateway).toBeDefined();
//     });

//     describe('handleRequestUnavailableOptions', () => {
//         it('should emit unavailable options when requested', () => {
//             const mockUnavailableOptions = { names: ['Name1'], avatars: ['Avatar1'] };
//             const mockLobby = {
//                 isLocked: false,
//                 maxPlayers: 4,
//                 players: [],
//                 waitingPlayers: [{ socketId: 'Name1', avatar: 'Avatar1' }],
//             };
//             lobbyService.getUnavailableNamesAndAvatars = jest.fn().mockReturnValue(mockUnavailableOptions);
//             lobbyService.getLobby = jest.fn().mockReturnValue(mockLobby as Lobby);

//             gateway.handleRequestUnavailableOptions(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: ['Avatar1'] });
//             expect(mockSocket.emit).toHaveBeenCalledWith('updateUnavailableOptions', mockUnavailableOptions.avatars);
//         });
//     });

//     describe('handleCreateLobby', () => {
//         it('should create lobby and emit events', () => {
//             gateway.handleCreateLobby({ game: MOCK_GAME }, mockSocket as Socket);

//             expect(lobbyService.createLobby).toHaveBeenCalledWith(MOCK_GAME);
//             expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
//             expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Test Game'));
//             expect(mockSocket.emit).toHaveBeenCalledWith('lobbyCreated', { accessCode: 'TEST123' });
//         });
//     });

//     describe('handleJoinRoom', () => {
//         it('should handle joining a non-existent lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

//             gateway.handleJoinRoom(TEST_ACCESS_CODE, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
//             expect(mockSocket.join).not.toHaveBeenCalled();
//             expect(mockServer.to).not.toHaveBeenCalled();
//         });

//         it('should successfully join a valid lobby and receive unavailable avatars', () => {
//             const mockLobby = {
//                 ...MOCK_LOBBY_LOCKED,
//                 players: [MOCK_PLAYER],
//                 waitingPlayers: [MOCK_WAITING_PLAYER],
//             };
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby);

//             gateway.handleJoinRoom(TEST_ACCESS_CODE, mockSocket as Socket);

//             const expectedAvatars = [TEST_AVATAR, MOCK_WAITING_PLAYER.avatar];

//             expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
//                 avatars: expectedAvatars,
//             });
//         });

//         it('should handle empty avatar lists', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

//             gateway.handleJoinRoom(TEST_ACCESS_CODE, mockSocket as Socket);

//             expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
//                 avatars: [],
//             });
//         });
//     });

//     describe('handleKickPlayer', () => {
//         const mockData = { accessCode: 'TEST123', playerName: 'BadPlayer' };

//         it('should handle kicking non-existent player', () => {
//             (lobbyService.getPlayerSocket as jest.Mock).mockReturnValue(undefined);

//             gateway.handleKickPlayer(mockData);

//             expect(lobbyService.getPlayerSocket).toHaveBeenCalledWith('BadPlayer');
//             expect(lobbyService.removePlayerSocket).not.toHaveBeenCalled();
//         });

//         it('should handle player with missing socket connection', () => {
//             const mockSocketId = 'ghost-socket-id';
//             (lobbyService.getPlayerSocket as jest.Mock).mockReturnValue(mockSocketId);
//             jest.spyOn(mockServer.sockets.sockets, 'get').mockReturnValue(undefined);

//             gateway.handleKickPlayer(mockData);

//             expect(mockServer.to).toHaveBeenCalledWith(mockSocketId);
//             expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith('BadPlayer');
//         });

//         it('should handle missing playerName in data', () => {
//             const invalidData = { accessCode: 'test-wrong' } as any;

//             gateway.handleKickPlayer(invalidData);

//             expect(lobbyService.getPlayerSocket).toHaveBeenCalledWith(undefined);
//         });
//     });

//     describe('handleJoinLobby', () => {
//         it('should handle invalid access code', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

//             gateway.handleJoinLobby({ accessCode: 'INVALID', player: MOCK_PLAYER }, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Invalid access code');
//         });

//         it('should handle locked lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue({ isLocked: true } as any);

//             gateway.handleJoinLobby({ accessCode: 'LOCKED', player: MOCK_PLAYER }, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('joinError', 'Lobby is locked and cannot be joined');
//         });

//         it('should successfully join lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);
//             jest.spyOn(lobbyService, 'joinLobby').mockReturnValue({ success: true });
//             jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([MOCK_PLAYER]);

//             gateway.handleJoinLobby({ accessCode: 'TEST123', player: MOCK_PLAYER }, mockSocket as Socket);

//             expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
//             expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', expect.anything());
//         });

//         it('should not successfully join lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);
//             jest.spyOn(lobbyService, 'joinLobby').mockReturnValue({ success: false });

//             gateway.handleJoinLobby({ accessCode: 'TEST123', player: MOCK_PLAYER }, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('joinError', 'Unable to join lobby');
//         });

//         it('should lock lobby when full', () => {
//             const mockLobby = {
//                 ...MOCK_LOBBY_LOCKED,
//                 maxPlayers: 1,
//                 players: [MOCK_PLAYER],
//             };

//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby);
//             jest.spyOn(lobbyService, 'joinLobby').mockReturnValue({ success: true });
//             jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([MOCK_PLAYER, MOCK_PLAYER]);

//             gateway.handleJoinLobby({ accessCode: TEST_ACCESS_CODE, player: MOCK_PLAYER }, mockSocket as Socket);

//             expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', expect.anything());

//             expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', {
//                 accessCode: TEST_ACCESS_CODE,
//                 isLocked: true,
//             });
//         });

//         it('should handle invalid access code when requesting unavailable options', () => {
//             const testAccessCode = 'INVALID';
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

//             gateway.handleRequestUnavailableOptions(testAccessCode, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
//             expect(mockServer.emit).not.toHaveBeenCalledWith('updateUnavailableOptions', expect.anything());
//             expect(mockSocket.emit).not.toHaveBeenCalledWith('updateUnavailableOptions', expect.anything());
//         });
//     });
//     describe('handleSelectAvatar', () => {
//         const mockData = { accessCode: TEST_ACCESS_CODE, avatar: TEST_AVATAR };
//         const mockClient = {
//             id: CLIENT_SOCKET_ID,
//             emit: jest.fn(),
//         } as unknown as Socket;

//         it('should handle non-existent lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

//             gateway.handleSelectAvatar(mockData, mockClient);

//             expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
//         });

//         it('should handle taken avatar', () => {
//             const mockLobby = {
//                 ...MOCK_LOBBY_UNLOCKED,
//                 players: [{ ...MOCK_PLAYER, avatar: TEST_AVATAR }],
//                 waitingPlayers: [],
//             };

//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby);

//             gateway.handleSelectAvatar(mockData, mockClient);

//             expect(mockClient.emit).toHaveBeenCalledWith('error', 'Cet avatar est déjà pris !');
//             expect(mockClient.emit).not.toHaveBeenCalledWith('avatarSelected', expect.anything());
//         });

//         it('should successfully select available avatar', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

//             gateway.handleSelectAvatar(mockData, mockClient);

//             expect(MOCK_LOBBY_LOCKED.waitingPlayers).toEqual([{ socketId: CLIENT_SOCKET_ID, avatar: TEST_AVATAR }]);
//             expect(mockServer.to).toHaveBeenCalledWith('test-code');
//             expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
//                 avatars: [TEST_AVATAR],
//             });
//             expect(mockClient.emit).toHaveBeenCalledWith('avatarSelected', { avatar: TEST_AVATAR });
//         });

//         it('should replace existing waiting player entry', () => {
//             const mockLobby = {
//                 players: [],
//                 waitingPlayers: [{ socketId: CLIENT_SOCKET_ID, avatar: 'old-avatar' }],
//             };
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

//             gateway.handleSelectAvatar(mockData, mockClient);

//             expect(mockLobby.waitingPlayers).toEqual([{ socketId: CLIENT_SOCKET_ID, avatar: TEST_AVATAR }]);
//         });

//         it('should handle mixed existing avatars', () => {
//             const mockLobby = {
//                 players: [{ avatar: 'avatar2' }],
//                 waitingPlayers: [{ socketId: 'other-client', avatar: 'avatar3' }],
//             };
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

//             gateway.handleSelectAvatar(mockData, mockClient);

//             expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
//                 avatars: ['avatar2', 'avatar3', TEST_AVATAR],
//             });
//         });
//     });

//     describe('handleGetLobbyPlayers', () => {
//         it('should emit players list', () => {
//             const mockPlayers = [{ name: TEST_PLAYER_NAME }];
//             jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(mockPlayers as any);

//             gateway.handleGetLobbyPlayers(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('updatePlayers', mockPlayers);
//         });
//         it('should not emit players list', () => {
//             jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(undefined);

//             gateway.handleGetLobbyPlayers(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
//         });
//     });

//     describe('handleGetLobby', () => {
//         it('should emit lobby data if exists', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

//             gateway.handleGetLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('updateLobby', MOCK_LOBBY_LOCKED);
//         });

//         it('should handle missing lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

//             gateway.handleGetLobby('INVALID', mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
//         });
//     });

//     describe('handleLockLobby', () => {
//         it('should lock existing lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

//             gateway.handleLockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(MOCK_LOBBY_LOCKED.isLocked).toBe(true);
//             expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', expect.anything());
//         });

//         it('should not lock if lobby does not exist', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

//             gateway.handleLockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
//         });
//     });

//     describe('handleUnlockLobby', () => {
//         it('should unlock valid lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

//             gateway.handleUnlockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(MOCK_LOBBY_LOCKED.isLocked).toBe(false);
//             expect(mockServer.emit).toHaveBeenCalledWith('lobbyUnlocked', expect.anything());
//         });

//         it('should prevent unlocking full lobby', () => {
//             const mockLobby = {
//                 accessCode: LOBBY_ACCESS_CODE,
//                 isLocked: true,
//                 players: [{}],
//                 maxPlayers: 1,
//             };
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

//             gateway.handleUnlockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby is full and cannot be unlocked');
//         });

//         it('should check if lobby exist', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

//             gateway.handleUnlockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

//             expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
//         });
//     });

//     describe('handleDeselectAvatar', () => {
//         const mockClient = {
//             id: 'client-socket-id',
//             emit: jest.fn(),
//         } as unknown as Socket;

//         beforeEach(() => {
//             jest.clearAllMocks();
//         });

//         it('should handle non-existent lobby', () => {
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

//             gateway.handleDeselectAvatar(LOBBY_ACCESS_CODE, mockClient);

//             expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
//             expect(mockServer.emit).not.toHaveBeenCalled();
//         });

//         it('should remove client from waiting players and update avatars', () => {
//             const mockLobby = {
//                 players: [{ avatar: 'avatar1' }],
//                 waitingPlayers: [
//                     { socketId: 'client-socket-id', avatar: 'avatar2' },
//                     { socketId: 'other-client', avatar: 'avatar3' },
//                 ],
//             };
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

//             gateway.handleDeselectAvatar(LOBBY_ACCESS_CODE, mockClient);

//             expect(mockLobby.waitingPlayers).toEqual([{ socketId: 'other-client', avatar: 'avatar3' }]);

//             const expectedAvatars = ['avatar1', 'avatar3'];
//             expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
//                 avatars: expectedAvatars,
//             });

//             expect(mockClient.emit).toHaveBeenCalledWith('avatarDeselected');
//         });

//         it('should handle client not in waiting players', () => {
//             const mockLobby = {
//                 players: [{ avatar: 'avatar1' }],
//                 waitingPlayers: [{ socketId: 'other-client', avatar: 'avatar2' }],
//             };
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

//             gateway.handleDeselectAvatar(LOBBY_ACCESS_CODE, mockClient);

//             expect(mockLobby.waitingPlayers).toHaveLength(1);

//             expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
//                 avatars: ['avatar1', 'avatar2'],
//             });

//             expect(mockClient.emit).toHaveBeenCalledWith('avatarDeselected');
//         });

//         it('should handle empty players and waiting players', () => {
//             const emptyLobby = { ...MOCK_LOBBY_UNLOCKED, players: [], waitingPlayers: [] };
//             jest.spyOn(lobbyService, 'getLobby').mockReturnValue(emptyLobby);

//             gateway.handleDeselectAvatar(LOBBY_ACCESS_CODE, mockClient);

//             expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
//                 avatars: [],
//             });
//         });
//     });

//     describe('Connection Handling', () => {
//         it('should handle connection with existing lobby', () => {
//             jest.spyOn(lobbyService, 'getLobbyIdByPlayer').mockReturnValue(LOBBY_ACCESS_CODE);

//             gateway.handleConnection(mockSocket as Socket);

//             expect(mockSocket.join).toHaveBeenCalledWith(LOBBY_ACCESS_CODE);
//         });

//         // it('should handle disconnection', () => {
//         //     jest.spyOn(lobbyService, 'getLobbyIdByPlayer').mockReturnValue(LOBBY_ACCESS_CODE);
//         //     const player = { name: 'allo' } as unknown as Player;
//         //     jest.spyOn(lobbyService, 'getPlayerBySocketId').mockReturnValue(player);
//         //     jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED);

//         //     gateway.handleDisconnect(mockSocket as Socket);

//         //     expect(lobbyService.leaveLobby).toHaveBeenCalledWith(LOBBY_ACCESS_CODE, 'allo');
//         //     expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', expect.anything());
//         // });
//     });
//     // it('should log initialization', () => {
//     //     gateway.afterInit();
//     //     expect(logger.log).toHaveBeenCalledWith('LobbyGateway initialized.');
//     // });
//     // it('should handle leaving a lobby and emit appropriate events', () => {
//     //     const accessCode = TEST_ACCESS_CODE;
//     //     const playerName = TEST_PLAYER_NAME;
//     //     const client = {
//     //         id: 'client-123',
//     //         leave: jest.fn(),
//     //     } as unknown as Socket;

//     //     const lobby: Lobby = {
//     //         accessCode,
//     //         game: {} as Game,
//     //         players: [
//     //             {
//     //                 name: playerName,
//     //                 avatar: 'avatar1',
//     //                 speed: 5,
//     //                 attack: { value: 4, bonusDice: DiceType.D6 },
//     //                 defense: { value: 4, bonusDice: DiceType.D4 },
//     //                 hp: { current: 10, max: 10 },
//     //                 movementPoints: 3,
//     //                 actionPoints: 3,
//     //                 inventory: [null, null],
//     //                 isAdmin: true,
//     //                 hasAbandoned: false,
//     //                 isActive: false,
//     //                 combatWon: 0,
//     //                 isVirtual: false,
//     //             },
//     //         ],
//     //         isLocked: false,
//     //         maxPlayers: 4,
//     //         waitingPlayers: [],
//     //     };

//     //     jest.spyOn(lobbyService, 'getLobby').mockReturnValue(lobby);
//     //     jest.spyOn(lobbyService, 'isAdminLeaving').mockReturnValue(true);
//     //     jest.spyOn(lobbyService, 'leaveLobby').mockReturnValue(true);
//     //     jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(lobby.players);

//     //     gateway.handleLeaveLobby({ accessCode, playerName }, client);

//     //     expect(lobbyService.getLobby).toHaveBeenCalledWith(accessCode);
//     //     expect(lobbyService.isAdminLeaving).toHaveBeenCalledWith(accessCode, playerName);
//     //     expect(lobbyService.leaveLobby).toHaveBeenCalledWith(accessCode, playerName);
//     //     expect(mockServer.to).toHaveBeenCalledWith(accessCode);
//     //     expect(mockServer.emit).toHaveBeenCalledWith('adminLeft', {
//     //         playerSocketId: client.id,
//     //         message: "L'admin a quitté la partie, le lobby est fermé.",
//     //     });
//     //     expect(mockServer.emit).toHaveBeenCalledWith('lobbyDeleted');
//     //     expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: [] });
//     //     expect(client.leave).toHaveBeenCalledWith(accessCode);
//     // });

//     // it('should handle leaving a lobby without deleting it', () => {
//     //     const accessCode = TEST_ACCESS_CODE;
//     //     const playerName = TEST_PLAYER_NAME;
//     //     const client = {
//     //         id: 'client-123',
//     //         leave: jest.fn(),
//     //     } as unknown as Socket;

//     //     const lobby: Lobby = {
//     //         accessCode,
//     //         game: {} as Game,
//     //         players: [
//     //             {
//     //                 name: playerName,
//     //                 avatar: 'avatar1',
//     //                 speed: 5,
//     //                 attack: { value: 4, bonusDice: DiceType.D6 },
//     //                 defense: { value: 4, bonusDice: DiceType.D4 },
//     //                 hp: { current: 10, max: 10 },
//     //                 movementPoints: 3,
//     //                 actionPoints: 3,
//     //                 inventory: [null, null],
//     //                 isAdmin: false,
//     //                 hasAbandoned: false,
//     //                 isActive: false,
//     //                 combatWon: 0,
//     //                 isVirtual: false,
//     //             },
//     //         ],
//     //         isLocked: false,
//     //         maxPlayers: 4,
//     //         waitingPlayers: [],
//     //     };

//     //     jest.spyOn(lobbyService, 'getLobby').mockReturnValue(lobby);
//     //     jest.spyOn(lobbyService, 'isAdminLeaving').mockReturnValue(false);
//     //     jest.spyOn(lobbyService, 'leaveLobby').mockReturnValue(false);
//     //     jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(lobby.players);

//     //     gateway.handleLeaveLobby({ accessCode, playerName }, client);

//     //     expect(lobbyService.getLobby).toHaveBeenCalledWith(accessCode);
//     //     expect(lobbyService.isAdminLeaving).toHaveBeenCalledWith(accessCode, playerName);
//     //     expect(lobbyService.leaveLobby).toHaveBeenCalledWith(accessCode, playerName);

//     //     expect(mockServer.to).toHaveBeenCalledWith(accessCode);
//     //     expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: ['avatar1'] });
//     //     expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', lobby.players);

//     //     expect(client.leave).toHaveBeenCalledWith(accessCode);
//     // });

//     // describe('handleKickPlayer', () => {
//     //     it('should call handleLeaveLobby if the kicked player has a valid socket', () => {
//     //         const accessCode = TEST_ACCESS_CODE;
//     //         const playerName = TEST_PLAYER_NAME;
//     //         const kickedPlayerSocketId = 'socket-123';
//     //         const kickedSocket = {
//     //             id: kickedPlayerSocketId,
//     //             leave: jest.fn(),
//     //         } as unknown as Socket;
//     //         jest.spyOn(lobbyService, 'getPlayerSocket').mockReturnValue(kickedPlayerSocketId);
//     //         jest.spyOn(mockServer.sockets.sockets, 'get').mockReturnValue(kickedSocket);
//     //         const handleLeaveLobbySpy = jest.spyOn(gateway, 'handleLeaveLobby');
//     //         gateway.handleKickPlayer({ accessCode, playerName });
//     //         expect(handleLeaveLobbySpy).toHaveBeenCalledWith({ accessCode, playerName }, kickedSocket);
//     //         expect(mockServer.to).toHaveBeenCalledWith(kickedPlayerSocketId);
//     //         expect(mockServer.emit).toHaveBeenCalledWith('kicked', { accessCode, playerName });
//     //         expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith(playerName);
//     //     });
//     //     it('should not call handleLeaveLobby if the kicked player has no valid socket', () => {
//     //         const accessCode = TEST_ACCESS_CODE;
//     //         const playerName = TEST_PLAYER_NAME;
//     //         jest.spyOn(lobbyService, 'getPlayerSocket').mockReturnValue('socket-123');
//     //         jest.spyOn(mockServer.sockets.sockets, 'get').mockReturnValue(null);
//     //         const handleLeaveLobbySpy = jest.spyOn(gateway, 'handleLeaveLobby');
//     //         gateway.handleKickPlayer({ accessCode, playerName });
//     //         expect(handleLeaveLobbySpy).not.toHaveBeenCalled();
//     //         expect(mockServer.to).toHaveBeenCalledWith('socket-123');
//     //         expect(mockServer.emit).toHaveBeenCalledWith('kicked', { accessCode, playerName });
//     //         expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith(playerName);
//     //     });
//     // });
// });
