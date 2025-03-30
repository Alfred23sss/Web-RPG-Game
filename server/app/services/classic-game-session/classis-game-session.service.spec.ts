/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */ // the original file respects this condition
/* eslint-disable @typescript-eslint/no-empty-function */ // necessary to get actual reference
/* eslint-disable @typescript-eslint/no-explicit-any */ // allows access to GameSessionService

import { ImageType, TileType } from '@app/enums/enums';
import { DiceType } from '@app/interfaces/Dice';
import { Game } from '@app/interfaces/Game';
import { GameSession } from '@app/interfaces/GameSession';
import { Lobby } from '@app/interfaces/Lobby';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { Turn } from '@app/interfaces/Turn';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameSessionService } from './classic-game-session.service';

const DEFAULT_TIME = 3000;
const SHORT_TIME = 1000;
const FAST_SPEED = 6;
const SLOW_SPEED = 4;
const ACCESS_CODE = 'test-code';
const PLAYER_MOVE_DELAY = 150;
const PLAYER_1_NAME = 'Player 1';
const PLAYER_2_NAME = 'Player 2';

const createValidPlayer = (name: string, speed: number, isAdmin: boolean): Player => ({
    name,
    avatar: 'default-avatar.png',
    speed,
    attack: { value: 4, bonusDice: DiceType.D6 },
    defense: { value: 4, bonusDice: DiceType.D4 },
    hp: { current: 10, max: 10 },
    movementPoints: 3,
    actionPoints: 3,
    inventory: [null, null],
    isAdmin,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
    vitality: 0,
});

const createMockTurn = (): Turn => ({
    orderedPlayers: [createValidPlayer(PLAYER_1_NAME, 5, true), createValidPlayer(PLAYER_2_NAME, 7, false)],
    currentPlayer: createValidPlayer(PLAYER_1_NAME, 5, true),
    currentTurnCountdown: 60,
    turnTimers: null,
    countdownInterval: null,
    isTransitionPhase: false,
    isInCombat: false,
    transitionTimeRemaining: undefined,
    beginnerPlayer: createValidPlayer('beginnerPlayer', 5, false),
});

const MOCK_TILE: Tile = {
    id: '',
    imageSrc: '',
    isOccupied: false,
    type: TileType.Default,
    isOpen: false,
};

const MOCK_LOBBY: Lobby = {
    accessCode: ACCESS_CODE,
    isLocked: false,
    maxPlayers: 4,
    game: {
        id: 'game-id',
        name: 'Test Game',
        size: { width: 2, height: 2 },
        mode: 'classic',
        grid: [
            [MOCK_TILE, MOCK_TILE],
            [MOCK_TILE, MOCK_TILE],
        ],
        lastModified: new Date(),
        isVisible: true,
        previewImage: 'test-image.jpg',
        description: 'Test game description',
    } as unknown as Game,
    players: [createValidPlayer(PLAYER_1_NAME, SLOW_SPEED, true), createValidPlayer(PLAYER_2_NAME, FAST_SPEED, false)],
    waitingPlayers: [],
};

const DEFAULT_SPAWN_TILE: Tile = {
    id: 'spawn-1',
    item: {
        id: '',
        imageSrc: '',
        imageSrcGrey: '',
        name: '',
        description: '',
        itemCounter: 0,
    },
    player: null,
    isOccupied: false,
    type: TileType.Default,
    imageSrc: '',
    isOpen: false,
};

const CLOSED_DOOR_TILE: Tile = {
    id: 'tile-1',
    imageSrc: ImageType.ClosedDoor,
    isOccupied: false,
    type: TileType.Door,
    isOpen: false,
    item: undefined,
    player: undefined,
};

const OPEN_DOOR_TILE: Tile = {
    ...CLOSED_DOOR_TILE,
    imageSrc: ImageType.OpenDoor,
    isOpen: true,
};

const createPlayerWithSpawn = (player: Player, spawnPoint: { tileId: string; x: number; y: number }) => ({
    ...player,
    spawnPoint,
});

const createMockGameSession = (grid: Tile[][], turnConfig: Partial<Turn>) => ({
    game: { ...MOCK_LOBBY.game, grid },
    turn: {
        ...createMockTurn(),
        orderedPlayers: [],
        ...turnConfig,
    },
});

describe('GameSessionService', () => {
    let gameSessionService: GameSessionService;
    let lobbyService: LobbyService;
    let accessCodesService: AccessCodesService;
    let eventEmitter: EventEmitter2;
    let logger: Logger;
    let gridManagerService: GridManagerService;
    let turnService: GameSessionTurnService;
    let testPlayer: Player;
    let movementPath: Tile[];

    beforeEach(() => {
        jest.useFakeTimers();
        accessCodesService = new AccessCodesService();
        lobbyService = new LobbyService(accessCodesService);
        eventEmitter = new EventEmitter2();
        gridManagerService = new GridManagerService(logger);
        turnService = new GameSessionTurnService(lobbyService, eventEmitter);

        gameSessionService = new GameSessionService(lobbyService, eventEmitter, gridManagerService, turnService);

        jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY);
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(MOCK_LOBBY.players);
        jest.spyOn(gridManagerService, 'clearPlayerFromGrid');
        jest.spyOn(gridManagerService, 'setPlayerOnTile');

        gameSessionService.createGameSession(ACCESS_CODE);

        jest.spyOn(eventEmitter, 'emit');
        (eventEmitter.emit as jest.Mock).mockClear();

        testPlayer = MOCK_LOBBY.players[0];
        movementPath = MOCK_LOBBY.game.grid.flat().slice(0, 3);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should clear timers and delete session', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        gameSessionService.deleteGameSession(MOCK_LOBBY.accessCode);

        expect(clearTimeoutSpy).toHaveBeenCalled();
        expect(clearIntervalSpy).toHaveBeenCalled();
        expect(gameSessionService['gameSessions'].has(MOCK_LOBBY.accessCode)).toBe(false);
    });

    it('should skip abandoned players', () => {
        const players = [createValidPlayer(PLAYER_1_NAME, FAST_SPEED, true), createValidPlayer(PLAYER_2_NAME, SLOW_SPEED, false)];
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode).turn.currentPlayer = players[0];

        gameSessionService.handlePlayerAbandoned(MOCK_LOBBY.accessCode, PLAYER_1_NAME);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);

        jest.advanceTimersByTime(DEFAULT_TIME);
        jest.advanceTimersByTime(SHORT_TIME);

        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        expect(session?.turn.currentPlayer?.name).toBe(PLAYER_2_NAME);
    });

    it('should handle resume attempt for non-existent session', () => {
        const emitSpy = jest.spyOn(eventEmitter, 'emit');
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        gameSessionService.resumeGameTurn('invalid-code', 10);
        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should maintain correct timer sequence after resume', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        const initialRemaining = gameSessionService.pauseGameTurn(MOCK_LOBBY.accessCode);
        const emitSpy = jest.spyOn(eventEmitter, 'emit');

        gameSessionService.resumeGameTurn(MOCK_LOBBY.accessCode, initialRemaining);

        jest.advanceTimersByTime(SHORT_TIME);
        expect(emitSpy).toHaveBeenCalledWith(
            'game.turn.timer',
            expect.objectContaining({
                timeLeft: initialRemaining - 1,
            }),
        );

        const endTurnSpy = jest.spyOn(gameSessionService, 'endTurn');
        jest.advanceTimersByTime(initialRemaining * SHORT_TIME);
        expect(endTurnSpy).toHaveBeenCalledWith(MOCK_LOBBY.accessCode);
    });

    it('should update combat state in game session if it exists', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);

        gameSessionService.setCombatState(MOCK_LOBBY.accessCode, true);
        expect(session.turn.isInCombat).toBe(true);

        gameSessionService.setCombatState(MOCK_LOBBY.accessCode, false);
        expect(session.turn.isInCombat).toBe(false);
    });

    it('should return false if game session does not exist', () => {
        const result = gameSessionService.isCurrentPlayer('non-existent-code', PLAYER_1_NAME);
        expect(result).toBe(false);
    });

    it('should return true if the given player is the current player', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const player = createValidPlayer('CurrentPlayer', FAST_SPEED, true);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        session.turn.currentPlayer = player;
        const result = gameSessionService.isCurrentPlayer(MOCK_LOBBY.accessCode, 'CurrentPlayer');
        expect(result).toBe(true);
    });

    it('should return early in startTransitionPhase if session not found', () => {
        const invalidCode = 'non-existent-code';
        const emitSpy = jest.spyOn(eventEmitter, 'emit');
        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        expect(() => {
            (gameSessionService as any).startTransitionPhase(invalidCode);
        }).not.toThrow();

        expect(setTimeoutSpy).not.toHaveBeenCalled();
        expect(setIntervalSpy).not.toHaveBeenCalled();
        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should return 0 when attempting to pause non-existent session', () => {
        const result = gameSessionService.pauseGameTurn('invalid-code');

        expect(result).toBe(0);

        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        expect(clearTimeoutSpy).not.toHaveBeenCalled();
        expect(clearIntervalSpy).not.toHaveBeenCalled();
    });

    it('should return empty array when getting players for non-existent session', () => {
        const players = gameSessionService.getPlayers('invalid-access-code');
        expect(players).toEqual([]);
    });

    it('should do nothing when ending turn for non-existent session', () => {
        const invalidCode = 'invalid-code';

        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        const updatePlayerSpy = jest.spyOn(gameSessionService as any, 'updatePlayer');
        const startTransitionSpy = jest.spyOn(gameSessionService as any, 'startTransitionPhase');

        gameSessionService.endTurn(invalidCode);

        expect(clearTimeoutSpy).not.toHaveBeenCalled();
        expect(clearIntervalSpy).not.toHaveBeenCalled();
        expect(updatePlayerSpy).not.toHaveBeenCalled();
        expect(startTransitionSpy).not.toHaveBeenCalled();
    });

    it('should return null when handling abandon for non-existent session', () => {
        const result = gameSessionService.handlePlayerAbandoned('invalid-code', 'AnyPlayer');

        expect(result).toBeNull();

        const updatePlayerSpy = jest.spyOn(gameSessionService as any, 'updatePlayer');
        expect(updatePlayerSpy).not.toHaveBeenCalled();
    });

    describe('handlePlayerAbandoned', () => {
        it('should clear spawn tile item when player has valid spawn point', () => {
            const spawnTile = DEFAULT_SPAWN_TILE;
            const playerWithSpawn = createPlayerWithSpawn(testPlayer, { tileId: 'spawn-1', x: 0, y: 0 });
            const mockGameSession = createMockGameSession([[spawnTile]], {
                orderedPlayers: [playerWithSpawn],
                currentPlayer: playerWithSpawn,
            });

            gameSessionService['gameSessions'] = new Map([[ACCESS_CODE, mockGameSession]]);

            const findTileSpy = jest.spyOn(gridManagerService, 'findTileById').mockReturnValue(spawnTile);
            const clearPlayerSpy = jest.spyOn(gridManagerService, 'clearPlayerFromGrid');
            const emitGridSpy = jest.spyOn(gameSessionService, 'emitGridUpdate');
            const endTurnSpy = jest.spyOn(gameSessionService, 'endTurn');
            const result = gameSessionService.handlePlayerAbandoned(ACCESS_CODE, testPlayer.name);

            expect(findTileSpy).toHaveBeenCalledWith([[spawnTile]], 'spawn-1');
            expect(spawnTile.item).toBeUndefined();
            expect(clearPlayerSpy).toHaveBeenCalledWith([[spawnTile]], testPlayer.name);
            expect(emitGridSpy).toHaveBeenCalledWith(ACCESS_CODE, [[spawnTile]]);
            expect(endTurnSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(result).toEqual(
                expect.objectContaining({
                    name: testPlayer.name,
                    hasAbandoned: true,
                }),
            );
        });
    });

    describe('updateDoorTile', () => {
        it('should return early if tiles are not adjacent', () => {
            const previousTile = { ...CLOSED_DOOR_TILE };
            const newTile = { ...CLOSED_DOOR_TILE };
            (gameSessionService as any).gameSessions = new Map([[ACCESS_CODE, { game: { grid: [[OPEN_DOOR_TILE, OPEN_DOOR_TILE]] } }]]);

            jest.spyOn(gridManagerService, 'findAndCheckAdjacentTiles').mockReturnValue(false);

            const emitSpy = jest.spyOn(eventEmitter, 'emit');
            gameSessionService.updateDoorTile(ACCESS_CODE, previousTile, newTile);

            expect(newTile.imageSrc).toBe(ImageType.ClosedDoor);
            expect(newTile.isOpen).toBe(false);
            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should handle the case where the targetTile is not found', () => {
            const previousTile = { ...CLOSED_DOOR_TILE };
            const newTile = { ...CLOSED_DOOR_TILE };
            (gameSessionService as any).gameSessions = new Map([[ACCESS_CODE, { game: { grid: [[OPEN_DOOR_TILE, OPEN_DOOR_TILE]] } }]]);

            jest.spyOn(gridManagerService, 'findAndCheckAdjacentTiles').mockReturnValue(true);

            const emitSpy = jest.spyOn(eventEmitter, 'emit');
            gameSessionService.updateDoorTile(ACCESS_CODE, previousTile, newTile);

            expect(emitSpy).toHaveBeenCalled();
        });

        describe('updateDoorTile', () => {
            it('should open closed doors and emit update', () => {
                const grid = [
                    [
                        { ...CLOSED_DOOR_TILE, id: 'tile-1' },
                        { ...CLOSED_DOOR_TILE, id: 'tile-2' },
                    ],
                ];

                const mockGameSession = createMockGameSession(grid, {
                    orderedPlayers: [],
                    currentPlayer: null,
                });

                gameSessionService['gameSessions'].set(ACCESS_CODE, mockGameSession);

                const targetTile = grid[0][1];
                jest.spyOn(gridManagerService, 'findAndCheckAdjacentTiles').mockReturnValue(true);
                const emitSpy = jest.spyOn(eventEmitter, 'emit');

                gameSessionService.updateDoorTile(ACCESS_CODE, grid[0][0], targetTile);

                expect(targetTile.imageSrc).toBe(ImageType.OpenDoor);
                expect(targetTile.isOpen).toBe(true);
                expect(emitSpy).toHaveBeenCalledWith('game.door.update', {
                    accessCode: ACCESS_CODE,
                    grid: mockGameSession.game.grid,
                });
            });
        });
    });

    describe('callTeleport', () => {
        it('should teleport player and update grid', () => {
            const gameSession = gameSessionService.createGameSession(ACCESS_CODE);
            const originalGrid = gameSession.game.grid;
            const player = MOCK_LOBBY.players[0];

            const updatedGridMock = [[...originalGrid[0]], [...originalGrid[1]]];
            jest.spyOn(gridManagerService, 'teleportPlayer').mockReturnValue(updatedGridMock);

            const emitSpy = jest.spyOn(gameSessionService, 'emitGridUpdate');
            gameSessionService.callTeleport(ACCESS_CODE, player, MOCK_TILE);

            expect(gridManagerService.teleportPlayer).toHaveBeenCalledWith(originalGrid, player, MOCK_TILE);
            expect(gameSessionService.getGameSession(ACCESS_CODE).game.grid).toBe(updatedGridMock);
            expect(emitSpy).toHaveBeenCalledWith(ACCESS_CODE, updatedGridMock);
        });
    });

    describe('updateGameSessionPlayerList', () => {
        const PLAYER_ADMIN_UPDATE: Partial<Player> = { isAdmin: true };

        it('should update the player when the player exists in the session', () => {
            const mockPlayer = createValidPlayer(PLAYER_1_NAME, SLOW_SPEED, false);
            const mockSession = createMockGameSession([], {
                orderedPlayers: [mockPlayer],
                currentPlayer: mockPlayer,
            });
            gameSessionService['gameSessions'].set(ACCESS_CODE, mockSession);

            const updatePlayerSpy = jest.spyOn(gameSessionService as any, 'updatePlayer');
            gameSessionService.updateGameSessionPlayerList(ACCESS_CODE, PLAYER_1_NAME, PLAYER_ADMIN_UPDATE);

            expect(updatePlayerSpy).toHaveBeenCalledWith(mockPlayer, PLAYER_ADMIN_UPDATE);
        });
    });

    describe('updatePlayerPosition', () => {
        it('should process movement steps with proper timing', async () => {
            const movePromise = gameSessionService.updatePlayerPosition(ACCESS_CODE, movementPath, testPlayer);
            expect(gridManagerService.clearPlayerFromGrid).not.toHaveBeenCalled();

            await jest.advanceTimersByTimeAsync(PLAYER_MOVE_DELAY);
            expect(gridManagerService.clearPlayerFromGrid).toHaveBeenCalledTimes(1);
            expect(gridManagerService.setPlayerOnTile).toHaveBeenCalledWith(MOCK_LOBBY.game.grid, movementPath[1], testPlayer);

            await jest.advanceTimersByTimeAsync(PLAYER_MOVE_DELAY);
            expect(gridManagerService.clearPlayerFromGrid).toHaveBeenCalledTimes(2);

            await movePromise;
        });

        describe('endGameSession', () => {
            it('should emit the game.ended event with the winner', () => {
                const winner = PLAYER_1_NAME;
                const emitSpy = jest.spyOn(eventEmitter, 'emit');
                gameSessionService.endGameSession(ACCESS_CODE, winner);
                const accessCode = 'test-code';
                expect(emitSpy).toHaveBeenCalledWith('game.ended', { accessCode, winner });
            });
        });

        describe('getGameSession', () => {
            it('should return undefined when game session does not exist', () => {
                const nonExistentCode = 'invalid-code';
                const result = gameSessionService.getGameSession(nonExistentCode);
                expect(result).toBeUndefined();
            });
        });

        describe('isCurrentPlayer', () => {
            it('should return true when player is current and not abandoned', () => {
                const currentPlayer = createValidPlayer(PLAYER_1_NAME, FAST_SPEED, true);
                const mockSession: GameSession = {
                    game: MOCK_LOBBY.game,
                    turn: {
                        ...createMockTurn(),
                        currentPlayer,
                        orderedPlayers: [currentPlayer],
                    },
                };
                gameSessionService['gameSessions'].set(ACCESS_CODE, mockSession);

                const result = gameSessionService.isCurrentPlayer(ACCESS_CODE, PLAYER_1_NAME);
                expect(result).toBe(true);
            });
        });

        describe('updatePlayerListSpawnPoint', () => {
            it('should update players in the game session with new spawn points', () => {
                const initialPlayer = createValidPlayer(PLAYER_1_NAME, SLOW_SPEED, true);
                initialPlayer.spawnPoint = undefined;

                const gameSession: GameSession = {
                    game: MOCK_LOBBY.game,
                    turn: {
                        orderedPlayers: [initialPlayer],
                        currentPlayer: initialPlayer,
                        currentTurnCountdown: 60,
                        turnTimers: null,
                        countdownInterval: null,
                        isTransitionPhase: false,
                        isInCombat: false,
                        beginnerPlayer: createValidPlayer('beginnerPlayer', 5, false),
                    },
                };
                gameSessionService['gameSessions'].set(ACCESS_CODE, gameSession);

                const updatedPlayer: Player = {
                    ...initialPlayer,
                    spawnPoint: { tileId: 'spawn-1', x: 0, y: 0 },
                };

                (gameSessionService as any).updatePlayerListSpawnPoint([updatedPlayer], ACCESS_CODE);

                const sessionPlayer = gameSessionService.getGameSession(ACCESS_CODE)?.turn.orderedPlayers.find((p) => p.name === PLAYER_1_NAME);
                expect(sessionPlayer?.spawnPoint).toEqual(updatedPlayer.spawnPoint);
            });
        });
    });
});
