/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DiceType } from '@app/interfaces/Dice';
import { Lobby } from '@app/interfaces/Lobby';
import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Namespace, Server, Socket } from 'socket.io';
import { LobbyGateway } from './lobby.gateway';

const TEST_ACCESS_CODE = 'test-code';
const LOBBY_ACCESS_CODE = 'test-lobby';
const TEST_PLAYER_NAME = 'test-player';
const TEST_AVATAR = 'test-avatar';
const TEST_SOCKET_ID = 'test-socket-id';
const MOCK_GAME = { name: 'Test Game' } as Game;
const CLIENT_SOCKET_ID = 'client-socket-id';
const MOCK_PLAYER: Player = {
    name: TEST_PLAYER_NAME,
    avatar: TEST_AVATAR,
    speed: 5,
    attack: {
        value: 4,
        bonusDice: DiceType.D4,
    },
    defense: {
        value: 4,
        bonusDice: DiceType.D6,
    },
    hp: {
        current: 10,
        max: 10,
    },
    movementPoints: 0,
    actionPoints: 0,
    inventory: [null, null],
    isAdmin: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
    vitality: 0,
};
const MOCK_WAITING_PLAYER = { socketId: 'socket2', avatar: 'avatar2' };
const MOCK_LOBBY_LOCKED: Lobby = {
    isLocked: false,
    maxPlayers: 4,
    players: [],
    waitingPlayers: [],
    accessCode: TEST_ACCESS_CODE,
    game: MOCK_GAME,
};
const MOCK_LOBBY_UNLOCKED: Lobby = {
    isLocked: false,
    maxPlayers: 4,
    players: [],
    waitingPlayers: [MOCK_WAITING_PLAYER],
    accessCode: TEST_ACCESS_CODE,
    game: MOCK_GAME,
};

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
            id: TEST_SOCKET_ID,
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
                        setPlayerSocket: jest.fn(),
                        removePlayerSocket: jest.fn(),
                        getPlayerSocket: jest.fn(),
                        isAdminLeaving: jest.fn(),
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
            const mockUnavailableOptions = { names: ['Name1'], avatars: ['Avatar1'] };
            const mockLobby = {
                isLocked: false,
                maxPlayers: 4,
                players: [],
                waitingPlayers: [{ socketId: 'Name1', avatar: 'Avatar1' }],
            };
            lobbyService.getUnavailableNamesAndAvatars = jest.fn().mockReturnValue(mockUnavailableOptions);
            lobbyService.getLobby = jest.fn().mockReturnValue(mockLobby as Lobby);

            gateway.handleRequestUnavailableOptions(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: ['Avatar1'] });
            expect(mockSocket.emit).toHaveBeenCalledWith('updateUnavailableOptions', mockUnavailableOptions.avatars);
        });
    });

    describe('handleCreateLobby', () => {
        it('should create lobby and emit events', () => {
            gateway.handleCreateLobby({ game: MOCK_GAME }, mockSocket as Socket);

            expect(lobbyService.createLobby).toHaveBeenCalledWith(MOCK_GAME);
            expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
            expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Test Game'));
            expect(mockSocket.emit).toHaveBeenCalledWith('lobbyCreated', { accessCode: 'TEST123' });
        });
    });

    describe('handleJoinRoom', () => {
        it('should handle joining a non-existent lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleJoinRoom(TEST_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
            expect(mockSocket.join).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should successfully join a valid lobby and receive unavailable avatars', () => {
            const mockLobby = {
                ...MOCK_LOBBY_LOCKED,
                players: [MOCK_PLAYER],
                waitingPlayers: [MOCK_WAITING_PLAYER],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby);

            gateway.handleJoinRoom(TEST_ACCESS_CODE, mockSocket as Socket);

            const expectedAvatars = [TEST_AVATAR, MOCK_WAITING_PLAYER.avatar];

            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: expectedAvatars,
            });
        });

        it('should handle empty avatar lists', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

            gateway.handleJoinRoom(TEST_ACCESS_CODE, mockSocket as Socket);

            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: [],
            });
        });
    });

    describe('handleKickPlayer', () => {
        const mockData = { accessCode: 'TEST123', playerName: 'BadPlayer' };

        it('should handle kicking non-existent player', () => {
            (lobbyService.getPlayerSocket as jest.Mock).mockReturnValue(undefined);

            gateway.handleKickPlayer(mockData);

            expect(lobbyService.getPlayerSocket).toHaveBeenCalledWith('BadPlayer');
            expect(lobbyService.removePlayerSocket).not.toHaveBeenCalled();
        });

        it('should handle player with missing socket connection', () => {
            const mockSocketId = 'ghost-socket-id';
            (lobbyService.getPlayerSocket as jest.Mock).mockReturnValue(mockSocketId);
            jest.spyOn(mockServer.sockets.sockets, 'get').mockReturnValue(undefined);

            gateway.handleKickPlayer(mockData);

            expect(mockServer.to).toHaveBeenCalledWith(mockSocketId);
            expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith('BadPlayer');
        });

        it('should handle missing playerName in data', () => {
            const invalidData = { accessCode: 'test-wrong' } as any;

            gateway.handleKickPlayer(invalidData);

            expect(lobbyService.getPlayerSocket).toHaveBeenCalledWith(undefined);
        });
    });

    describe('handleJoinLobby', () => {
        it('should handle invalid access code', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleJoinLobby({ accessCode: 'INVALID', player: MOCK_PLAYER }, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Invalid access code');
        });

        it('should handle locked lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue({ isLocked: true } as any);

            gateway.handleJoinLobby({ accessCode: 'LOCKED', player: MOCK_PLAYER }, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('joinError', 'Lobby is locked and cannot be joined');
        });

        it('should successfully join lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);
            jest.spyOn(lobbyService, 'joinLobby').mockReturnValue({ success: true });
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([MOCK_PLAYER]);

            gateway.handleJoinLobby({ accessCode: 'TEST123', player: MOCK_PLAYER }, mockSocket as Socket);

            expect(mockSocket.join).toHaveBeenCalledWith('TEST123');
            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', expect.anything());
        });

        it('should not successfully join lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);
            jest.spyOn(lobbyService, 'joinLobby').mockReturnValue({ success: false });

            gateway.handleJoinLobby({ accessCode: 'TEST123', player: MOCK_PLAYER }, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('joinError', 'Unable to join lobby');
        });

        it('should lock lobby when full', () => {
            const mockLobby = {
                ...MOCK_LOBBY_LOCKED,
                maxPlayers: 1,
                players: [MOCK_PLAYER],
            };

            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby);
            jest.spyOn(lobbyService, 'joinLobby').mockReturnValue({ success: true });
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([MOCK_PLAYER, MOCK_PLAYER]);

            gateway.handleJoinLobby({ accessCode: TEST_ACCESS_CODE, player: MOCK_PLAYER }, mockSocket as Socket);

            expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', {
                accessCode: TEST_ACCESS_CODE,
                isLocked: true,
            });
        });

        it('should handle invalid access code when requesting unavailable options', () => {
            const testAccessCode = 'INVALID';
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleRequestUnavailableOptions(testAccessCode, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
            expect(mockServer.emit).not.toHaveBeenCalledWith('updateUnavailableOptions', expect.anything());
            expect(mockSocket.emit).not.toHaveBeenCalledWith('updateUnavailableOptions', expect.anything());
        });
    });

    describe('handleDeleteLobby', () => {
        const mockRoom = new Set(['socket1', 'socket2']);
        const mockLobby = {
            isLocked: false,
            maxPlayers: 1,
            players: [MOCK_PLAYER],
        };
        it('should delete lobby and clean up clients', () => {
            mockServer.sockets.adapter.rooms.set(LOBBY_ACCESS_CODE, mockRoom);

            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);
            jest.spyOn(mockServer.sockets.sockets, 'get').mockReturnValue(mockSocket as any);

            gateway.handleDeleteLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockServer.emit).toHaveBeenCalledWith('lobbyDeleted');
            expect(lobbyService.leaveLobby).toHaveBeenCalled();
        });

        it('should not delete lobby if lobby does not exist', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleDeleteLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby does not exist');
        });

        it('should not delete lobby if room socket does not exist', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);
            jest.spyOn(mockServer.sockets.adapter.rooms, 'get').mockReturnValue(undefined);

            gateway.handleDeleteLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby test-lobby does not exist.');
        });
    });

    describe('handleSelectAvatar', () => {
        const mockData = { accessCode: TEST_ACCESS_CODE, avatar: TEST_AVATAR };
        const mockClient = {
            id: CLIENT_SOCKET_ID,
            emit: jest.fn(),
        } as unknown as Socket;

        it('should handle non-existent lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleSelectAvatar(mockData, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });

        it('should handle taken avatar', () => {
            const mockLobby = {
                ...MOCK_LOBBY_UNLOCKED,
                players: [{ ...MOCK_PLAYER, avatar: TEST_AVATAR }],
                waitingPlayers: [],
            };

            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby);

            gateway.handleSelectAvatar(mockData, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Cet avatar est déjà pris !');
            expect(mockClient.emit).not.toHaveBeenCalledWith('avatarSelected', expect.anything());
        });

        it('should successfully select available avatar', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

            gateway.handleSelectAvatar(mockData, mockClient);

            expect(MOCK_LOBBY_LOCKED.waitingPlayers).toEqual([{ socketId: CLIENT_SOCKET_ID, avatar: TEST_AVATAR }]);
            expect(mockServer.to).toHaveBeenCalledWith('test-code');
            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: [TEST_AVATAR],
            });
            expect(mockClient.emit).toHaveBeenCalledWith('avatarSelected', { avatar: TEST_AVATAR });
        });

        it('should replace existing waiting player entry', () => {
            const mockLobby = {
                players: [],
                waitingPlayers: [{ socketId: CLIENT_SOCKET_ID, avatar: 'old-avatar' }],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleSelectAvatar(mockData, mockClient);

            expect(mockLobby.waitingPlayers).toEqual([{ socketId: CLIENT_SOCKET_ID, avatar: TEST_AVATAR }]);
        });

        it('should handle mixed existing avatars', () => {
            const mockLobby = {
                players: [{ avatar: 'avatar2' }],
                waitingPlayers: [{ socketId: 'other-client', avatar: 'avatar3' }],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleSelectAvatar(mockData, mockClient);

            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: ['avatar2', 'avatar3', TEST_AVATAR],
            });
        });
    });

    describe('handleGetLobbyPlayers', () => {
        it('should emit players list', () => {
            const mockPlayers = [{ name: TEST_PLAYER_NAME }];
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(mockPlayers as any);

            gateway.handleGetLobbyPlayers(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('updatePlayers', mockPlayers);
        });
        it('should not emit players list', () => {
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(undefined);

            gateway.handleGetLobbyPlayers(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleGetLobby', () => {
        it('should emit lobby data if exists', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

            gateway.handleGetLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('updateLobby', MOCK_LOBBY_LOCKED);
        });

        it('should handle missing lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleGetLobby('INVALID', mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleLockLobby', () => {
        it('should lock existing lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

            gateway.handleLockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(MOCK_LOBBY_LOCKED.isLocked).toBe(true);
            expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', expect.anything());
        });

        it('should not lock if lobby does not exist', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleLockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleUnlockLobby', () => {
        it('should unlock valid lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY_LOCKED as any);

            gateway.handleUnlockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(MOCK_LOBBY_LOCKED.isLocked).toBe(false);
            expect(mockServer.emit).toHaveBeenCalledWith('lobbyUnlocked', expect.anything());
        });

        it('should prevent unlocking full lobby', () => {
            const mockLobby = {
                accessCode: LOBBY_ACCESS_CODE,
                isLocked: true,
                players: [{}],
                maxPlayers: 1,
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleUnlockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby is full and cannot be unlocked');
        });

        it('should check if lobby exist', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleUnlockLobby(LOBBY_ACCESS_CODE, mockSocket as Socket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Lobby not found');
        });
    });

    describe('handleDeselectAvatar', () => {
        const mockClient = {
            id: 'client-socket-id',
            emit: jest.fn(),
        } as unknown as Socket;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should handle non-existent lobby', () => {
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(undefined);

            gateway.handleDeselectAvatar(LOBBY_ACCESS_CODE, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', 'Lobby not found');
            expect(mockServer.emit).not.toHaveBeenCalled();
        });

        it('should remove client from waiting players and update avatars', () => {
            const mockLobby = {
                players: [{ avatar: 'avatar1' }],
                waitingPlayers: [
                    { socketId: 'client-socket-id', avatar: 'avatar2' },
                    { socketId: 'other-client', avatar: 'avatar3' },
                ],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleDeselectAvatar(LOBBY_ACCESS_CODE, mockClient);

            expect(mockLobby.waitingPlayers).toEqual([{ socketId: 'other-client', avatar: 'avatar3' }]);

            const expectedAvatars = ['avatar1', 'avatar3'];
            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: expectedAvatars,
            });

            expect(mockClient.emit).toHaveBeenCalledWith('avatarDeselected');
        });

        it('should handle client not in waiting players', () => {
            const mockLobby = {
                players: [{ avatar: 'avatar1' }],
                waitingPlayers: [{ socketId: 'other-client', avatar: 'avatar2' }],
            };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(mockLobby as any);

            gateway.handleDeselectAvatar(LOBBY_ACCESS_CODE, mockClient);

            expect(mockLobby.waitingPlayers).toHaveLength(1);

            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: ['avatar1', 'avatar2'],
            });

            expect(mockClient.emit).toHaveBeenCalledWith('avatarDeselected');
        });

        it('should handle empty players and waiting players', () => {
            const emptyLobby = { ...MOCK_LOBBY_UNLOCKED, players: [], waitingPlayers: [] };
            jest.spyOn(lobbyService, 'getLobby').mockReturnValue(emptyLobby);

            gateway.handleDeselectAvatar(LOBBY_ACCESS_CODE, mockClient);

            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', {
                avatars: [],
            });
        });
    });

    describe('Connection Handling', () => {
        it('should handle connection with existing lobby', () => {
            jest.spyOn(lobbyService, 'getLobbyIdByPlayer').mockReturnValue(LOBBY_ACCESS_CODE);

            gateway.handleConnection(mockSocket as Socket);

            expect(mockSocket.join).toHaveBeenCalledWith(LOBBY_ACCESS_CODE);
        });

        it('should handle disconnection', () => {
            jest.spyOn(lobbyService, 'getLobbyIdByPlayer').mockReturnValue(LOBBY_ACCESS_CODE);
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([]);

            gateway.handleDisconnect(mockSocket as Socket);

            expect(lobbyService.leaveLobby).toHaveBeenCalledWith(LOBBY_ACCESS_CODE, TEST_SOCKET_ID);
            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', expect.anything());
        });
    });
    it('should log initialization', () => {
        gateway.afterInit();
        expect(logger.log).toHaveBeenCalledWith('LobbyGateway initialized.');
    });
    it('should handle leaving a lobby and emit appropriate events', () => {
        const accessCode = '1234';
        const playerName = 'Player1';
        const client = {
            id: 'client-123',
            leave: jest.fn(),
        } as unknown as Socket;

        const lobby: Lobby = {
            accessCode,
            game: {} as Game,
            players: [
                {
                    name: playerName,
                    avatar: 'avatar1',
                    speed: 5,
                    vitality: 10,
                    attack: { value: 4, bonusDice: DiceType.D6 },
                    defense: { value: 4, bonusDice: DiceType.D4 },
                    hp: { current: 10, max: 10 },
                    movementPoints: 3,
                    actionPoints: 3,
                    inventory: [null, null],
                    isAdmin: true,
                    hasAbandoned: false,
                    isActive: false,
                    combatWon: 0,
                },
            ],
            isLocked: false,
            maxPlayers: 4,
            waitingPlayers: [],
        };

        jest.spyOn(lobbyService, 'getLobby').mockReturnValue(lobby);
        jest.spyOn(lobbyService, 'isAdminLeaving').mockReturnValue(true);
        jest.spyOn(lobbyService, 'leaveLobby').mockReturnValue(true);
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(lobby.players);

        gateway.handleLeaveLobby({ accessCode, playerName }, client);

        expect(lobbyService.getLobby).toHaveBeenCalledWith(accessCode);
        expect(lobbyService.isAdminLeaving).toHaveBeenCalledWith(accessCode, playerName);
        expect(lobbyService.leaveLobby).toHaveBeenCalledWith(accessCode, playerName);
        expect(mockServer.to).toHaveBeenCalledWith(accessCode);
        expect(mockServer.emit).toHaveBeenCalledWith('adminLeft', { message: "L'admin a quitté la partie, le lobby est fermé." });
        expect(mockServer.emit).toHaveBeenCalledWith('lobbyDeleted');
        expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: [] });
        expect(client.leave).toHaveBeenCalledWith(accessCode);
    });

    it('should handle leaving a lobby without deleting it', () => {
        const accessCode = '1234';
        const playerName = 'Player1';
        const client = {
            id: 'client-123',
            leave: jest.fn(),
        } as unknown as Socket;

        const lobby: Lobby = {
            accessCode,
            game: {} as Game,
            players: [
                {
                    name: playerName,
                    avatar: 'avatar1',
                    speed: 5,
                    vitality: 10,
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
                },
            ],
            isLocked: false,
            maxPlayers: 4,
            waitingPlayers: [],
        };

        jest.spyOn(lobbyService, 'getLobby').mockReturnValue(lobby);
        jest.spyOn(lobbyService, 'isAdminLeaving').mockReturnValue(false);
        jest.spyOn(lobbyService, 'leaveLobby').mockReturnValue(false);
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(lobby.players);

        gateway.handleLeaveLobby({ accessCode, playerName }, client);

        expect(lobbyService.getLobby).toHaveBeenCalledWith(accessCode);
        expect(lobbyService.isAdminLeaving).toHaveBeenCalledWith(accessCode, playerName);
        expect(lobbyService.leaveLobby).toHaveBeenCalledWith(accessCode, playerName);

        expect(mockServer.to).toHaveBeenCalledWith(accessCode);
        expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: ['avatar1'] });
        expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', lobby.players);
        expect(mockServer.emit).toHaveBeenCalledWith('lobbyUnlocked', { accessCode, isLocked: false });

        expect(client.leave).toHaveBeenCalledWith(accessCode);
    });

    describe('handleKickPlayer', () => {
        it('should call handleLeaveLobby if the kicked player has a valid socket', () => {
            const accessCode = '1234';
            const playerName = 'Player1';
            const kickedPlayerSocketId = 'socket-123';
            const kickedSocket = {
                id: kickedPlayerSocketId,
                leave: jest.fn(),
            } as unknown as Socket;
            jest.spyOn(lobbyService, 'getPlayerSocket').mockReturnValue(kickedPlayerSocketId);
            jest.spyOn(mockServer.sockets.sockets, 'get').mockReturnValue(kickedSocket);
            const handleLeaveLobbySpy = jest.spyOn(gateway, 'handleLeaveLobby');
            gateway.handleKickPlayer({ accessCode, playerName });
            expect(handleLeaveLobbySpy).toHaveBeenCalledWith({ accessCode, playerName }, kickedSocket);
            expect(mockServer.to).toHaveBeenCalledWith(kickedPlayerSocketId);
            expect(mockServer.emit).toHaveBeenCalledWith('kicked', { accessCode, playerName });
            expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith(playerName);
        });
        it('should not call handleLeaveLobby if the kicked player has no valid socket', () => {
            const accessCode = '1234';
            const playerName = 'Player1';
            jest.spyOn(lobbyService, 'getPlayerSocket').mockReturnValue('socket-123');
            jest.spyOn(mockServer.sockets.sockets, 'get').mockReturnValue(null);
            const handleLeaveLobbySpy = jest.spyOn(gateway, 'handleLeaveLobby');
            gateway.handleKickPlayer({ accessCode, playerName });
            expect(handleLeaveLobbySpy).not.toHaveBeenCalled();
            expect(mockServer.to).toHaveBeenCalledWith('socket-123');
            expect(mockServer.emit).toHaveBeenCalledWith('kicked', { accessCode, playerName });
            expect(lobbyService.removePlayerSocket).toHaveBeenCalledWith(playerName);
        });
    });
});
