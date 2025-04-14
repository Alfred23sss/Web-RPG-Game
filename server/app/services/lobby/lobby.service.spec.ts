/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */ // the original file respects this condition
import { GameSize, GameSizePlayerCount, GameSizeTileCount } from '@app/enums/enums';
import { DiceType } from '@app/interfaces/Dice';
import { Lobby } from '@app/interfaces/Lobby';
import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LobbyService } from './lobby.service';

const ACCESS_CODE = 'test-code';
const SOCKED_ID = 'test-id';
const GAME = { size: GameSizeTileCount.Small } as Game;

const MOCK_PLAYER: Player = {
    name: 'Player1',
    avatar: 'avatar1',
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
    isVirtual: false,
};

describe('LobbyService', () => {
    let lobbyService: LobbyService;
    let accessCodesService: AccessCodesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyService,
                {
                    provide: AccessCodesService,
                    useValue: {
                        generateAccessCode: jest.fn().mockReturnValue('ACCESS_CODE'),
                        removeAccessCode: jest.fn(),
                    },
                },
            ],
        }).compile();

        lobbyService = module.get<LobbyService>(LobbyService);
        accessCodesService = module.get<AccessCodesService>(AccessCodesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(lobbyService).toBeDefined();
    });

    describe('createLobby', () => {
        it('should create a lobby with correct parameters and access code', () => {
            const game = { size: GameSizeTileCount.Small } as Game;
            const accessCode = lobbyService.createLobby(game);

            expect(accessCode).toBe('ACCESS_CODE');
            expect(accessCodesService.generateAccessCode).toHaveBeenCalled();

            const lobby = lobbyService.getLobby(accessCode);
            expect(lobby).toEqual({
                accessCode: 'ACCESS_CODE',
                game,
                players: [],
                isLocked: false,
                maxPlayers: GameSizePlayerCount.Small,
                waitingPlayers: [],
            });
        });

        it('should set correct maxPlayers for different game sizes', () => {
            const smallGame = { size: GameSizeTileCount.Small } as Game;
            const mediumGame = { size: GameSizeTileCount.Medium } as Game;
            const largeGame = { size: GameSizeTileCount.Large } as Game;

            lobbyService.createLobby(smallGame);
            expect(lobbyService.getLobby('ACCESS_CODE')?.maxPlayers).toBe(GameSizePlayerCount.Small);

            lobbyService.createLobby(mediumGame);
            expect(lobbyService.getLobby('ACCESS_CODE')?.maxPlayers).toBe(GameSizePlayerCount.Medium);

            lobbyService.createLobby(largeGame);
            expect(lobbyService.getLobby('ACCESS_CODE')?.maxPlayers).toBe(GameSizePlayerCount.Large);
        });
    });

    describe('getLobby', () => {
        it('should return undefined for non-existent access code', () => {
            expect(lobbyService.getLobby('invalid')).toBeUndefined();
        });

        it('should return existing lobby', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);
            expect(lobbyService.getLobby(accessCode)).toBeDefined();
        });
    });

    describe('joinLobby', () => {
        it('should return false for non-existent lobby', () => {
            expect(lobbyService.joinLobby('invalid', MOCK_PLAYER)).toStrictEqual({ reason: 'Lobby not found', success: false });
        });

        it('should prevent duplicate names or avatars', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);

            expect(lobbyService.joinLobby(accessCode, MOCK_PLAYER)).toStrictEqual({
                assignedName: 'Player1',
                success: true,
            });

            expect(
                lobbyService.joinLobby(accessCode, {
                    ...MOCK_PLAYER,
                    avatar: 'avatar2',
                }),
            ).toStrictEqual({
                assignedName: 'Player1-2',
                success: true,
            });

            expect(
                lobbyService.joinLobby(accessCode, {
                    ...MOCK_PLAYER,
                    name: 'Player2',
                }),
            ).toStrictEqual({
                assignedName: 'Player2',
                success: true,
            });
        });

        it('should lock lobby when reaching max players', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);

            for (let i = 0; i < GameSizePlayerCount.Small; i++) {
                expect(lobbyService.joinLobby(accessCode, { name: `player${i}`, avatar: `avatar${i}` } as Player)).toStrictEqual({
                    assignedName: `player${i}`,
                    success: true,
                });
            }

            const lobby = lobbyService.getLobby(accessCode);
            expect(lobby?.isLocked).toBe(false);

            expect(lobbyService.joinLobby(accessCode, { name: 'new', avatar: 'new' } as Player)).toStrictEqual({
                assignedName: 'new',
                success: true,
            });
        });
    });
    describe('leaveLobby', () => {
        const adminPlayer: Player = {
            ...MOCK_PLAYER,
            name: 'Admin',
            isAdmin: true,
        };
        const regularPlayer: Player = {
            ...MOCK_PLAYER,
            name: 'RegularPlayer',
        };

        it('should return false for non-existent lobby', () => {
            expect(lobbyService.leaveLobby('invalid', 'player')).toBe(false);
        });

        it('should delete lobby when last player leaves', () => {
            const accessCode = lobbyService.createLobby({ size: GameSize.Small } as Game);
            lobbyService.joinLobby(accessCode, regularPlayer);
            expect(lobbyService.leaveLobby(accessCode, regularPlayer.name)).toBe(true);
            expect(lobbyService.getLobby(accessCode)).toBeUndefined();
        });

        it('should delete lobby when admin leaves (even with other players)', () => {
            const accessCode = lobbyService.createLobby({ size: GameSize.Medium } as Game);

            lobbyService.joinLobby(accessCode, adminPlayer);

            lobbyService.joinLobby(accessCode, regularPlayer);

            expect(lobbyService.leaveLobby(accessCode, adminPlayer.name)).toBe(true);

            expect(lobbyService.getLobby(accessCode)).toBeUndefined();
            expect(accessCodesService.removeAccessCode).toHaveBeenCalledWith(accessCode);
        });

        it('should not delete lobby when regular player leaves', () => {
            const accessCode = lobbyService.createLobby({ size: GameSize.Large } as Game);

            lobbyService.joinLobby(accessCode, adminPlayer);

            lobbyService.joinLobby(accessCode, regularPlayer);

            expect(lobbyService.leaveLobby(accessCode, regularPlayer.name)).toBe(false);

            expect(lobbyService.getLobby(accessCode)).toBeDefined();
        });
    });

    describe('getLobbyPlayers', () => {
        it('should return empty array for non-existent lobby', () => {
            expect(lobbyService.getLobbyPlayers('invalid')).toEqual([]);
        });

        it('should return players in lobby', () => {
            const accessCode = lobbyService.createLobby(GAME);
            const player: Player = { name: 'test', avatar: 'avatar', isAdmin: false } as Player;
            lobbyService.joinLobby(accessCode, player);

            expect(lobbyService.getLobbyPlayers(accessCode)).toEqual([player]);
        });
    });

    describe('clearLobby', () => {
        it('should remove the lobby', () => {
            const accessCode = lobbyService.createLobby(GAME);
            lobbyService.clearLobby(accessCode);
            expect(lobbyService.getLobby(accessCode)).toBeUndefined();
        });
    });

    describe('getLobbyIdByPlayer', () => {
        it('should return undefined if player not found', () => {
            expect(lobbyService.getLobbyIdByPlayer('unknown')).toBeUndefined();
        });

        it('should return access code if player exists in lobby', () => {
            const accessCode = lobbyService.createLobby(GAME);
            const player: Player = { name: 'test', avatar: 'avatar', isAdmin: false } as Player;
            lobbyService.joinLobby(accessCode, player);

            expect(lobbyService.getLobbyIdByPlayer(player.name)).toBe(accessCode);
        });
    });

    describe('getUnavailableNamesAndAvatars', () => {
        it('should return used names and avatars', () => {
            const accessCode = lobbyService.createLobby(GAME);
            const player1 = { ...MOCK_PLAYER, name: 'Player1', avatar: 'avatar1' };
            const player2 = { ...MOCK_PLAYER, name: 'Player2', avatar: 'avatar2' };

            lobbyService.joinLobby(accessCode, player1);
            lobbyService.joinLobby(accessCode, player2);

            expect(lobbyService.getUnavailableNamesAndAvatars(accessCode)).toEqual({
                names: ['Player1', 'Player2'],
                avatars: ['avatar1', 'avatar2'],
            });
        });

        it('should return used names and avatars', () => {
            const accessCode = lobbyService.createLobby(GAME);
            const player1: Player = { name: 'test1', avatar: 'avatar1', isAdmin: false } as Player;
            const player2: Player = { name: 'test2', avatar: 'avatar2', isAdmin: false } as Player;
            lobbyService.joinLobby(accessCode, player1);
            lobbyService.joinLobby(accessCode, player2);

            expect(lobbyService.getUnavailableNamesAndAvatars(accessCode)).toEqual({
                names: ['test1', 'test2'],
                avatars: ['avatar1', 'avatar2'],
            });
        });
    });

    describe('setPlayerSocket', () => {
        it('should set the socket ID for a player', () => {
            const playerName = 'Player1';
            const socketId = 'socket-123';

            lobbyService.setPlayerSocket(playerName, socketId);

            expect(lobbyService.getPlayerSocket(playerName)).toBe(socketId);
        });
    });

    describe('getPlayerSocket', () => {
        it('should return the socket ID for a player', () => {
            const socketId = 'socket-123';

            lobbyService.setPlayerSocket(MOCK_PLAYER.name, socketId);

            expect(lobbyService.getPlayerSocket(MOCK_PLAYER.name)).toBe(socketId);
        });

        it('should return undefined for a non-existent player', () => {
            expect(lobbyService.getPlayerSocket('NonExistentPlayer')).toBeUndefined();
        });
    });

    describe('removePlayerSocket', () => {
        it('should remove the socket ID for a player', () => {
            const socketId = 'socket-123';

            lobbyService.setPlayerSocket(MOCK_PLAYER.name, socketId);
            lobbyService.removePlayerSocket(MOCK_PLAYER.name);

            expect(lobbyService.getPlayerSocket(MOCK_PLAYER.name)).toBeUndefined();
        });

        it('should do nothing if the player does not exist', () => {
            expect(() => {
                lobbyService.removePlayerSocket('NonExistentPlayer');
            }).not.toThrow();
        });
    });

    describe('getWaitingAvatars', () => {
        it('should return the waiting players for a lobby', () => {
            const waitingPlayers: Player[] = [
                MOCK_PLAYER,
                {
                    ...MOCK_PLAYER,
                    name: 'Player2',
                    avatar: 'avatar2',
                },
            ];
            (lobbyService as any).lobbies = new Map([
                [
                    ACCESS_CODE,
                    {
                        waitingPlayers,
                    },
                ],
            ]);

            expect(lobbyService.getWaitingAvatars(ACCESS_CODE)).toEqual(waitingPlayers);
        });
    });

    describe('isAdminLeaving', () => {
        it('should return true if the admin is leaving', () => {
            const adminPlayer: Player = {
                ...MOCK_PLAYER,
                name: 'Admin',
                isAdmin: true,
            };

            (lobbyService as any).lobbies = new Map([[ACCESS_CODE, { players: [adminPlayer] }]]);
            expect(lobbyService.isAdminLeaving(ACCESS_CODE, adminPlayer.name)).toBe(true);
        });

        it('should return false if a non-admin is leaving', () => {
            const regularPlayer: Player = { ...MOCK_PLAYER };
            (lobbyService as any).lobbies = new Map([[ACCESS_CODE, { players: [regularPlayer] }]]);
            expect(lobbyService.isAdminLeaving(ACCESS_CODE, regularPlayer.name)).toBe(false);
        });

        it('should return false for a non-existent lobby', () => {
            expect(lobbyService.isAdminLeaving('invalid', 'Admin')).toBe(false);
        });
    });
    describe('isNameTaken', () => {
        it('should return true if the player name is already taken', () => {
            const lobby: Lobby = {
                accessCode: 'ACCESS_CODE',
                game: {} as Game,
                players: [MOCK_PLAYER],
                isLocked: false,
                maxPlayers: 4,
                waitingPlayers: [],
            };

            const duplicatePlayer: Player = {
                ...MOCK_PLAYER,
                avatar: 'different-avatar',
            };

            expect(lobbyService.isNameTaken(lobby, duplicatePlayer)).toBe(true);
        });
    });

    it('should return false if the player name is not taken', () => {
        const player1 = { ...MOCK_PLAYER };
        const player2 = {
            ...MOCK_PLAYER,
            name: 'Player2',
            avatar: 'avatar2',
        };

        const lobby: Lobby = {
            accessCode: 'ACCESS_CODE',
            game: {} as Game,
            players: [player1],
            isLocked: false,
            maxPlayers: 4,
            waitingPlayers: [],
        };

        expect(lobbyService.isNameTaken(lobby, player2)).toBe(false);
    });

    it('should lock lobby when exactly reaching max players', () => {
        const accessCode = lobbyService.createLobby(GAME);

        Array.from({ length: GameSizePlayerCount.Small }).forEach((_, i) => {
            lobbyService.joinLobby(accessCode, {
                ...MOCK_PLAYER,
                name: `Player${i}`,
                avatar: `Avatar${i}`,
            });
        });

        const lobby = lobbyService.getLobby(accessCode);
        expect(lobby?.isLocked).toBe(true);
    });

    it('should stay locked when exceeding max players', () => {
        const game = { size: GameSizeTileCount.Small } as Game;
        const accessCode = lobbyService.createLobby(game);

        for (let i = 0; i < GameSizePlayerCount.Small + 1; i++) {
            lobbyService.joinLobby(accessCode, { name: `player${i}`, avatar: `avatar${i}` } as Player);
        }

        const lobby = lobbyService.getLobby(accessCode);
        expect(lobby?.isLocked).toBe(true);
    });

    it('should keep lobby locked when player count equals max after leaving', () => {
        const game = { size: GameSizeTileCount.Medium } as Game;
        const accessCode = lobbyService.createLobby(game);

        for (let i = 0; i < GameSizePlayerCount.Medium; i++) {
            lobbyService.joinLobby(accessCode, { name: `player${i}`, avatar: `avatar${i}` } as Player);
        }

        lobbyService.joinLobby(accessCode, { name: 'excess', avatar: 'excess' } as Player);
        lobbyService.leaveLobby(accessCode, 'excess');

        const lobby = lobbyService.getLobby(accessCode);
        expect(lobby?.isLocked).toBe(true);
    });

    describe('getUnavailableNamesAndAvatars', () => {
        it('should return empty arrays when lobby does not exist', () => {
            const result = lobbyService.getUnavailableNamesAndAvatars('INVALID_CODE');

            expect(result).toEqual({
                names: [],
                avatars: [],
            });
        });

        it('should return used names and avatars', () => {
            const accessCode = lobbyService.createLobby({ size: GameSize.Small } as Game);

            const player1 = { ...MOCK_PLAYER };
            const player2 = {
                ...MOCK_PLAYER,
                name: 'Player2',
                avatar: 'avatar2',
            };

            lobbyService.joinLobby(accessCode, player1);
            lobbyService.joinLobby(accessCode, player2);

            expect(lobbyService.getUnavailableNamesAndAvatars(accessCode)).toEqual({
                names: ['Player1', 'Player2'],
                avatars: ['avatar1', 'avatar2'],
            });
        });
    });

    describe('addPlayerToRoom', () => {
        it('should add player to room mapping', () => {
            const socketId = 'socket-123';
            const roomId = 'ROOM_ID';

            lobbyService.addPlayerToRoom(socketId, roomId);

            expect(lobbyService.getRoomForPlayer(socketId)).toBe(roomId);
        });
    });

    describe('getPlayerBySocketId', () => {
        it('should find player in lobby by socket ID', () => {
            const playerName = 'TestPlayer';
            const accessCode = 'ROOM_ID';

            (lobbyService as any).playerSockets.set(playerName, SOCKED_ID);

            (lobbyService as any).playerRoomMap.set(SOCKED_ID, accessCode);

            const mockPlayer = {
                ...MOCK_PLAYER,
                name: playerName,
            };
            const lobby = {
                accessCode,
                players: [mockPlayer],
                game: GAME,
                isLocked: false,
                maxPlayers: 4,
                waitingPlayers: [],
            };
            (lobbyService as any).lobbies.set(accessCode, lobby);

            const result = lobbyService.getPlayerBySocketId(SOCKED_ID);

            expect(result).toEqual(mockPlayer);
        });

        it('should return undefined when playerEntry does not exist', () => {
            const unknownSocketId = 'unknown-socket';

            const result = lobbyService.getPlayerBySocketId(unknownSocketId);

            expect(result).toBeUndefined();
        });

        it('should return undefined when lobbyId is not found for socket ID', () => {
            const playerName = 'TestPlayer';

            (lobbyService as any).playerSockets.set(playerName, SOCKED_ID);

            const result = lobbyService.getPlayerBySocketId(SOCKED_ID);

            expect(result).toBeUndefined();
        });

        it('should return undefined when lobby does not exist', () => {
            const playerName = 'test-player';
            const invalidAccessCode = 'invalid-room';

            (lobbyService as any).playerSockets.set(playerName, SOCKED_ID);
            (lobbyService as any).playerRoomMap.set(SOCKED_ID, invalidAccessCode);

            const result = lobbyService.getPlayerBySocketId(SOCKED_ID);
            expect(result).toBeUndefined();
        });
    });

    describe('removePlayerFromRoom', () => {
        it('should remove player from room mapping', () => {
            const roomId = 'ROOM_ID';

            lobbyService.addPlayerToRoom(SOCKED_ID, roomId);
            expect(lobbyService.getRoomForPlayer(SOCKED_ID)).toBe(roomId);

            lobbyService.removePlayerFromRoom(SOCKED_ID);

            expect(lobbyService.getRoomForPlayer(SOCKED_ID)).toBeNull();
        });

        it('should handle non-existent socket ID', () => {
            const invalidSocketId = 'invalid-socket';

            expect(() => {
                lobbyService.removePlayerFromRoom(invalidSocketId);
            }).not.toThrow();

            expect(lobbyService.getRoomForPlayer(invalidSocketId)).toBeNull();
        });
    });
});
