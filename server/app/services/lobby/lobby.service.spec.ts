import { GameSize, GameSizePlayerCount } from '@app/enums/enums';
import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LobbyService } from './lobby.service';

describe('LobbyService', () => {
    let lobbyService: LobbyService;
    let accessCodesService: AccessCodesService;
    let logger: Logger;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyService,
                {
                    provide: AccessCodesService,
                    useValue: {
                        generateAccessCode: jest.fn().mockReturnValue('1234'),
                        removeAccessCode: jest.fn(),
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

        lobbyService = module.get<LobbyService>(LobbyService);
        accessCodesService = module.get<AccessCodesService>(AccessCodesService);
        logger = module.get<Logger>(Logger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(lobbyService).toBeDefined();
    });

    describe('createLobby', () => {
        it('should create a lobby with correct parameters and access code', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);

            expect(accessCode).toBe('1234');
            expect(accessCodesService.generateAccessCode).toHaveBeenCalled();

            const lobby = lobbyService.getLobby(accessCode);
            expect(lobby).toEqual({
                accessCode: '1234',
                game,
                players: [],
                isLocked: false,
                maxPlayers: GameSizePlayerCount.Small,
            });
        });

        it('should set correct maxPlayers for different game sizes', () => {
            const smallGame = { size: GameSize.Small } as Game;
            const mediumGame = { size: GameSize.Medium } as Game;
            const largeGame = { size: GameSize.Large } as Game;

            lobbyService.createLobby(smallGame);
            expect(lobbyService.getLobby('1234')?.maxPlayers).toBe(GameSizePlayerCount.Small);

            lobbyService.createLobby(mediumGame);
            expect(lobbyService.getLobby('1234')?.maxPlayers).toBe(GameSizePlayerCount.Medium);

            lobbyService.createLobby(largeGame);
            expect(lobbyService.getLobby('1234')?.maxPlayers).toBe(GameSizePlayerCount.Large);
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
        const player: Player = { name: 'test', avatar: 'avatar1', isAdmin: false } as Player;

        it('should return false for non-existent lobby', () => {
            expect(lobbyService.joinLobby('invalid', player)).toBe(false);
        });

        it('should prevent duplicate names or avatars', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);

            expect(lobbyService.joinLobby(accessCode, player)).toBe(true);

            expect(lobbyService.joinLobby(accessCode, { ...player, avatar: 'avatar2' })).toBe(false);

            expect(lobbyService.joinLobby(accessCode, { ...player, name: 'test2' })).toBe(false);
        });

        it('should lock lobby when reaching max players', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);

            for (let i = 0; i < GameSizePlayerCount.Small; i++) {
                expect(lobbyService.joinLobby(accessCode, { name: `player${i}`, avatar: `avatar${i}` } as Player)).toBe(true);
            }

            const lobby = lobbyService.getLobby(accessCode);
            expect(lobby?.isLocked).toBe(true);

            expect(lobbyService.joinLobby(accessCode, { name: 'new', avatar: 'new' } as Player)).toBe(false);
        });
    });

    describe('leaveLobby', () => {
        const adminPlayer: Player = { name: 'admin', avatar: 'admin', isAdmin: true } as Player;
        const regularPlayer: Player = { name: 'player', avatar: 'avatar', isAdmin: false } as Player;

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

        it('should unlock lobby when player leaves and capacity allows', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);

            for (let i = 0; i < GameSizePlayerCount.Small; i++) {
                lobbyService.joinLobby(accessCode, { name: `player${i}`, avatar: `avatar${i}` } as Player);
            }
            lobbyService.leaveLobby(accessCode, 'player0');
            const lobby = lobbyService.getLobby(accessCode);
            expect(lobby?.isLocked).toBe(false);
        });
    });

    describe('getLobbyPlayers', () => {
        it('should return empty array for non-existent lobby', () => {
            expect(lobbyService.getLobbyPlayers('invalid')).toEqual([]);
        });

        it('should return players in lobby', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);
            const player: Player = { name: 'test', avatar: 'avatar', isAdmin: false } as Player;
            lobbyService.joinLobby(accessCode, player);

            expect(lobbyService.getLobbyPlayers(accessCode)).toEqual([player]);
        });
    });

    describe('clearLobby', () => {
        it('should remove the lobby', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);
            lobbyService.clearLobby(accessCode);
            expect(lobbyService.getLobby(accessCode)).toBeUndefined();
        });
    });

    describe('getLobbyIdByPlayer', () => {
        it('should return undefined if player not found', () => {
            expect(lobbyService.getLobbyIdByPlayer('unknown')).toBeUndefined();
        });

        it('should return access code if player exists in lobby', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);
            const player: Player = { name: 'test', avatar: 'avatar', isAdmin: false } as Player;
            lobbyService.joinLobby(accessCode, player);

            expect(lobbyService.getLobbyIdByPlayer(player.name)).toBe(accessCode);
        });
    });

    describe('getUnavailableNamesAndAvatars', () => {
        it('should return empty arrays for non-existent lobby', () => {
            expect(lobbyService.getUnavailableNamesAndAvatars('invalid')).toEqual({
                names: [],
                avatars: [],
            });
        });

        it('should return used names and avatars', () => {
            const game = { size: GameSize.Small } as Game;
            const accessCode = lobbyService.createLobby(game);
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
});
