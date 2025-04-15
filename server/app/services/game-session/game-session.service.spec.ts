/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */ // the original file respects this condition
/* eslint-disable @typescript-eslint/no-empty-function */ // necessary to get actual reference
/* eslint-disable @typescript-eslint/no-explicit-any */ // allows access to GameSessionService

import { DiceType } from '@app/interfaces/dice';
import { Game } from '@app/interfaces/game';
import { GameSession } from '@app/interfaces/game-session';
import { Item } from '@app/interfaces/item';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { Turn } from '@app/interfaces/turn';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { ItemEffectsService } from '@app/services/item-effects/item-effects.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { GameMode, ImageType, ItemName, TeamType, TileType } from '@common/enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameSessionService } from './game-session.service';

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
    isVirtual: false,
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
    let itemService: ItemEffectsService;
    let accessCodesService: AccessCodesService;
    let eventEmitter: EventEmitter2;
    let gridManagerService: GridManagerService;
    let turnService: GameSessionTurnService;
    let testPlayer: Player;
    let testMovementPath: Tile[];

    beforeEach(() => {
        jest.useFakeTimers();

        accessCodesService = new AccessCodesService();
        lobbyService = new LobbyService(accessCodesService);
        eventEmitter = new EventEmitter2();
        gridManagerService = new GridManagerService(eventEmitter);
        turnService = new GameSessionTurnService(lobbyService, eventEmitter);
        itemService = new ItemEffectsService(eventEmitter, gridManagerService);

        gameSessionService = new GameSessionService(eventEmitter, lobbyService, gridManagerService, turnService, itemService);

        jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY);
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(MOCK_LOBBY.players);
        jest.spyOn(gridManagerService, 'clearPlayerFromGrid');
        jest.spyOn(gridManagerService, 'setPlayerOnTile');
        jest.spyOn(itemService, 'addEffect').mockImplementation(() => {});
        jest.spyOn(itemService, 'removeEffects').mockImplementation(() => {});

        gameSessionService.createGameSession(ACCESS_CODE, 'Classic');

        jest.spyOn(eventEmitter, 'emit');
        (eventEmitter.emit as jest.Mock).mockClear();

        testPlayer = MOCK_LOBBY.players[0];
        testMovementPath = MOCK_LOBBY.game.grid.flat().slice(0, 3);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should clear timers and delete session', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode, 'Classic');
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

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode, 'Classic');

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

    it('should return false if player is current but has abandoned', () => {
        const playerName = PLAYER_1_NAME;
        const abandonedPlayer = {
            ...createValidPlayer(playerName, 5, true),
            hasAbandoned: true,
        };

        const mockSession: GameSession = {
            game: MOCK_LOBBY.game,
            turn: {
                ...createMockTurn(),
                beginnerPlayer: abandonedPlayer,
                orderedPlayers: [abandonedPlayer],
                currentPlayer: abandonedPlayer,
            },
        };

        gameSessionService['gameSessions'].set(ACCESS_CODE, mockSession);

        const result = gameSessionService.isCurrentPlayer(ACCESS_CODE, playerName);
        expect(result).toBe(false);
    });

    it('should maintain correct timer sequence after resume', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode, 'Classic');

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
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode, 'Classic');
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
            const player = createValidPlayer(PLAYER_1_NAME, SLOW_SPEED, false) as VirtualPlayer;
            const emitSpy = jest.spyOn(eventEmitter, 'emit');
            gameSessionService.updateDoorTile(ACCESS_CODE, previousTile, newTile, player);

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
            const player = createValidPlayer(PLAYER_1_NAME, SLOW_SPEED, false) as VirtualPlayer;
            gameSessionService.updateDoorTile(ACCESS_CODE, previousTile, newTile, player);

            expect(emitSpy).toHaveBeenCalled();
        });

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
            const player = createValidPlayer(PLAYER_1_NAME, SLOW_SPEED, false) as VirtualPlayer;

            gameSessionService.updateDoorTile(ACCESS_CODE, grid[0][0], targetTile, player);

            expect(targetTile.imageSrc).toBe(ImageType.OpenDoor);
            expect(targetTile.isOpen).toBe(true);
            expect(emitSpy).toHaveBeenCalledWith('game.door.update', {
                accessCode: ACCESS_CODE,
                grid: mockGameSession.game.grid,
                isOpen: true,
                player,
            });
        });
    });

    describe('callTeleport', () => {
        it('should teleport player and update grid', () => {
            const gameSession = gameSessionService.createGameSession(ACCESS_CODE, 'Classic');
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
            const movePromise = gameSessionService.updatePlayerPosition(ACCESS_CODE, testMovementPath, testPlayer);
            expect(gridManagerService.clearPlayerFromGrid).not.toHaveBeenCalled();

            await jest.advanceTimersByTimeAsync(PLAYER_MOVE_DELAY);
            expect(gridManagerService.clearPlayerFromGrid).toHaveBeenCalledTimes(1);
            expect(gridManagerService.setPlayerOnTile).toHaveBeenCalledWith(MOCK_LOBBY.game.grid, testMovementPath[1], testPlayer);

            await jest.advanceTimersByTimeAsync(PLAYER_MOVE_DELAY);
            await movePromise;
        });

        describe('endGameSession', () => {
            it('should emit the game.ended event with the winner', () => {
                const winner = PLAYER_1_NAME;
                const emitSpy = jest.spyOn(eventEmitter, 'emit');
                gameSessionService.endGameSession(ACCESS_CODE, [winner]);
                const accessCode = 'test-code';
                expect(emitSpy).toHaveBeenCalledWith('game.ended', { accessCode, winner: [winner] });
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
                const beginnerPlayer = createValidPlayer(PLAYER_1_NAME, FAST_SPEED, true);
                const mockSession: GameSession = {
                    game: MOCK_LOBBY.game,
                    turn: {
                        ...createMockTurn(),
                        beginnerPlayer,
                        orderedPlayers: [beginnerPlayer],
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

        describe('addItemToPlayer', () => {
            beforeEach(() => {
                itemService = {
                    addItemToPlayer: jest.fn(),
                } as unknown as ItemEffectsService;

                gameSessionService = new GameSessionService(eventEmitter, lobbyService, gridManagerService, turnService, itemService);
            });

            it('should update player inventory when adding an item without special effects', () => {
                const item = {
                    id: 'test-item-1',
                    name: 'Test Item',
                    description: 'An item for testing',
                    imageSrc: 'test-item.png',
                    imageSrcGrey: 'test-item-grey.png',
                    itemCounter: 0,
                };

                const updatedInventory: [typeof item, typeof item | null] = [item, null];

                const updatedPlayer = {
                    ...testPlayer,
                    inventory: updatedInventory,
                };

                const mockGameSession = createMockGameSession(MOCK_LOBBY.game.grid, {});

                (itemService.addItemToPlayer as jest.Mock).mockReturnValue({
                    player: updatedPlayer as Player,
                    items: null,
                });

                jest.spyOn(gameSessionService as any, 'updateGameSessionPlayerList');

                (gameSessionService as any).addItemToPlayer(ACCESS_CODE, testPlayer, item, mockGameSession);

                expect(itemService.addItemToPlayer).toHaveBeenCalledWith(testPlayer, item, mockGameSession.game.grid, ACCESS_CODE);
                expect((gameSessionService as any).updateGameSessionPlayerList).toHaveBeenCalledWith(ACCESS_CODE, testPlayer.name, {
                    ...updatedPlayer,
                });
            });

            it('should not update player inventory when adding an item with special effects', () => {
                const item = {
                    id: 'test-item-1',
                    name: 'Test Item',
                    description: 'An item for testing',
                    imageSrc: 'test-item.png',
                    imageSrcGrey: 'test-item-grey.png',
                    itemCounter: 0,
                };

                const updatedInventory: [typeof item, typeof item | null] = [item, null];

                const updatedPlayer = {
                    ...testPlayer,
                    inventory: updatedInventory,
                };

                const specialEffectItems = [
                    {
                        id: 'effect-item',
                        name: 'Effect Item',
                        description: 'Special effect item',
                        imageSrc: 'effect-item.png',
                        imageSrcGrey: 'effect-item-grey.png',
                        itemCounter: 0,
                    },
                ];

                const mockGameSession = createMockGameSession(MOCK_LOBBY.game.grid, {});

                (itemService.addItemToPlayer as jest.Mock).mockReturnValue({
                    player: updatedPlayer as Player,
                    items: specialEffectItems,
                });

                jest.spyOn(gameSessionService as any, 'updateGameSessionPlayerList');

                (gameSessionService as any).addItemToPlayer(ACCESS_CODE, testPlayer, item, mockGameSession);

                expect(itemService.addItemToPlayer).toHaveBeenCalledWith(testPlayer, item, mockGameSession.game.grid, ACCESS_CODE);
                expect((gameSessionService as any).updateGameSessionPlayerList).not.toHaveBeenCalled();
            });
        });

        describe('createGameSession', () => {
            it('should initialize turn with CTF mode when gameMode is CTF', () => {
                turnService.initializeTurnCTF = jest.fn().mockReturnValue(createMockTurn());
                turnService.initializeTurn = jest.fn().mockReturnValue(createMockTurn());

                gridManagerService.assignItemsToRandomItems = jest.fn().mockReturnValue(MOCK_LOBBY.game.grid);
                gridManagerService.findSpawnPoints = jest.fn().mockReturnValue([]);
                gridManagerService.assignPlayersToSpawnPoints = jest.fn().mockReturnValue([MOCK_LOBBY.players, MOCK_LOBBY.game.grid]);

                gameSessionService['updatePlayerListSpawnPoint'] = jest.fn();
                gameSessionService['startTransitionPhase'] = jest.fn();
                gameSessionService['gameSessions'] = new Map();

                gameSessionService.createGameSession(ACCESS_CODE, GameMode.CTF);

                expect(turnService.initializeTurnCTF).toHaveBeenCalledWith(ACCESS_CODE);
                expect(turnService.initializeTurn).not.toHaveBeenCalled();
            });

            it('should initialize turn with regular mode when gameMode is not CTF', () => {
                turnService.initializeTurnCTF = jest.fn().mockReturnValue(createMockTurn());
                turnService.initializeTurn = jest.fn().mockReturnValue(createMockTurn());

                gridManagerService.assignItemsToRandomItems = jest.fn().mockReturnValue(MOCK_LOBBY.game.grid);
                gridManagerService.findSpawnPoints = jest.fn().mockReturnValue([]);
                gridManagerService.assignPlayersToSpawnPoints = jest.fn().mockReturnValue([MOCK_LOBBY.players, MOCK_LOBBY.game.grid]);

                gameSessionService['updatePlayerListSpawnPoint'] = jest.fn();
                gameSessionService['startTransitionPhase'] = jest.fn();
                gameSessionService['gameSessions'] = new Map();

                gameSessionService.createGameSession(ACCESS_CODE, GameMode.Classic);

                expect(turnService.initializeTurn).toHaveBeenCalledWith(ACCESS_CODE);
                expect(turnService.initializeTurnCTF).not.toHaveBeenCalled();
            });
        });

        describe('updateWallTile', () => {
            it('should update the grid and player when game session exists', () => {
                const previousTile = { ...MOCK_TILE, id: 'prev-tile', type: TileType.Wall };
                const newTile = { ...MOCK_TILE, id: 'new-tile', type: TileType.Wall };
                const updatedPlayer = { ...testPlayer, actionPoints: testPlayer.actionPoints - 1 };
                const updatedGrid = [...MOCK_LOBBY.game.grid];

                jest.spyOn(gridManagerService, 'updateWallTile').mockReturnValue([updatedGrid, updatedPlayer]);
                jest.spyOn(gameSessionService as any, 'updateGameSessionPlayerList');

                const mockGameSession = createMockGameSession(MOCK_LOBBY.game.grid, {});
                gameSessionService['gameSessions'] = new Map();
                gameSessionService['gameSessions'].set(ACCESS_CODE, mockGameSession);

                gameSessionService.updateWallTile(ACCESS_CODE, previousTile, newTile, testPlayer);

                expect(gridManagerService.updateWallTile).toHaveBeenCalledWith(
                    mockGameSession.game.grid,
                    ACCESS_CODE,
                    previousTile,
                    newTile,
                    testPlayer,
                );
                expect(mockGameSession.game.grid).toBe(updatedGrid);
                expect((gameSessionService as any).updateGameSessionPlayerList).toHaveBeenCalledWith(ACCESS_CODE, updatedPlayer.name, updatedPlayer);
            });

            it('should return early if game session does not exist', () => {
                const previousTile = { ...MOCK_TILE, id: 'prev-tile', type: TileType.Wall };
                const newTile = { ...MOCK_TILE, id: 'new-tile', type: TileType.Wall };

                jest.spyOn(gridManagerService, 'updateWallTile');
                jest.spyOn(gameSessionService as any, 'updateGameSessionPlayerList');

                gameSessionService['gameSessions'] = new Map();
                gameSessionService.updateWallTile(ACCESS_CODE, previousTile, newTile, testPlayer);

                expect(gridManagerService.updateWallTile).not.toHaveBeenCalled();
                expect((gameSessionService as any).updateGameSessionPlayerList).not.toHaveBeenCalled();
            });
        });

        describe('updateWallTile', () => {
            it('should update the grid and player when game session exists', () => {
                const previousTile = { ...MOCK_TILE, id: 'prev-tile', type: TileType.Wall };
                const newTile = { ...MOCK_TILE, id: 'new-tile', type: TileType.Wall };
                const updatedPlayer = { ...testPlayer, actionPoints: testPlayer.actionPoints - 1 };
                const updatedGrid = [...MOCK_LOBBY.game.grid];

                jest.spyOn(gridManagerService, 'updateWallTile').mockReturnValue([updatedGrid, updatedPlayer]);
                jest.spyOn(gameSessionService as any, 'updateGameSessionPlayerList');

                const mockGameSession = createMockGameSession(MOCK_LOBBY.game.grid, {});
                gameSessionService['gameSessions'] = new Map();
                gameSessionService['gameSessions'].set(ACCESS_CODE, mockGameSession);

                gameSessionService.updateWallTile(ACCESS_CODE, previousTile, newTile, testPlayer);

                expect(gridManagerService.updateWallTile).toHaveBeenCalledWith(
                    mockGameSession.game.grid,
                    ACCESS_CODE,
                    previousTile,
                    newTile,
                    testPlayer,
                );
                expect(mockGameSession.game.grid).toBe(updatedGrid);
                expect((gameSessionService as any).updateGameSessionPlayerList).toHaveBeenCalledWith(ACCESS_CODE, updatedPlayer.name, updatedPlayer);
            });

            it('should return early if game session does not exist', () => {
                const previousTile = { ...MOCK_TILE, id: 'prev-tile', type: TileType.Wall };
                const newTile = { ...MOCK_TILE, id: 'new-tile', type: TileType.Wall };

                jest.spyOn(gridManagerService, 'updateWallTile');
                jest.spyOn(gameSessionService as any, 'updateGameSessionPlayerList');

                gameSessionService['gameSessions'] = new Map();
                gameSessionService.updateWallTile(ACCESS_CODE, previousTile, newTile, testPlayer);

                expect(gridManagerService.updateWallTile).not.toHaveBeenCalled();
                expect((gameSessionService as any).updateGameSessionPlayerList).not.toHaveBeenCalled();
            });
        });

        describe('handlePlayerItemReset', () => {
            beforeEach(() => {
                itemService = {
                    handlePlayerItemReset: jest.fn(),
                } as unknown as ItemEffectsService;

                gameSessionService = new GameSessionService(eventEmitter, lobbyService, gridManagerService, turnService, itemService);

                gameSessionService.getGameSession = jest.fn().mockReturnValue({
                    game: {
                        grid: MOCK_LOBBY.game.grid,
                    },
                });

                gameSessionService['updateGameSessionPlayerList'] = jest.fn();
            });

            it('should reset player items and update the game session player list', () => {
                const updatedPlayer = {
                    ...testPlayer,
                    inventory: [null, null] as [Item | null, Item | null],
                    hp: { current: 8, max: 10 },
                    movementPoints: 5,
                };

                (itemService.handlePlayerItemReset as jest.Mock).mockReturnValue({
                    name: testPlayer.name,
                    player: updatedPlayer,
                });

                gameSessionService.handlePlayerItemReset(ACCESS_CODE, testPlayer);

                expect(gameSessionService.getGameSession).toHaveBeenCalledWith(ACCESS_CODE);
                expect(itemService.handlePlayerItemReset).toHaveBeenCalledWith(testPlayer, MOCK_LOBBY.game.grid, ACCESS_CODE);
                expect(gameSessionService['updateGameSessionPlayerList']).toHaveBeenCalledWith(ACCESS_CODE, testPlayer.name, updatedPlayer);
            });

            it('should handle player with different property updates', () => {
                const updatedPlayer = {
                    ...testPlayer,
                    inventory: [null, null] as [Item | null, Item | null],
                    attack: { value: 3, bonusDice: DiceType.D4 },
                    defense: { value: 2, bonusDice: DiceType.D6 },
                };

                (itemService.handlePlayerItemReset as jest.Mock).mockReturnValue({
                    name: testPlayer.name,
                    player: updatedPlayer,
                });

                gameSessionService.handlePlayerItemReset(ACCESS_CODE, testPlayer);

                expect(gameSessionService.getGameSession).toHaveBeenCalledWith(ACCESS_CODE);
                expect(itemService.handlePlayerItemReset).toHaveBeenCalledWith(testPlayer, MOCK_LOBBY.game.grid, ACCESS_CODE);
                expect(gameSessionService['updateGameSessionPlayerList']).toHaveBeenCalledWith(ACCESS_CODE, testPlayer.name, updatedPlayer);
            });
        });

        describe('handleItemDropped', () => {
            let mockItem: Item;
            let mockGameSession: GameSession;

            beforeEach(() => {
                mockItem = {
                    id: 'item-1',
                    name: 'Test Item',
                    description: 'Test Description',
                    imageSrc: 'test-image.png',
                    imageSrcGrey: 'test-image-grey.png',
                    itemCounter: 0,
                };

                mockGameSession = createMockGameSession(
                    [
                        [DEFAULT_SPAWN_TILE, MOCK_TILE],
                        [MOCK_TILE, MOCK_TILE],
                    ],
                    {},
                );

                jest.spyOn(gameSessionService, 'getGameSession').mockReturnValue(mockGameSession);

                const mockItemEffectsService = {
                    handleItemDropped: jest.fn().mockReturnValue({
                        name: testPlayer.name,
                        player: { ...testPlayer, inventory: [null, null] },
                    }),
                };

                Object.defineProperty(gameSessionService, 'itemEffectsService', {
                    get: () => mockItemEffectsService,
                });

                jest.spyOn(gameSessionService, 'updateGameSessionPlayerList').mockImplementation();
            });

            it('should process item drop and update the player list', () => {
                gameSessionService.handleItemDropped(ACCESS_CODE, testPlayer, mockItem);

                expect(gameSessionService['itemEffectsService'].handleItemDropped).toHaveBeenCalledWith(
                    testPlayer,
                    mockItem,
                    mockGameSession.game.grid,
                    ACCESS_CODE,
                );

                expect(gameSessionService.updateGameSessionPlayerList).toHaveBeenCalledWith(ACCESS_CODE, testPlayer.name, {
                    ...testPlayer,
                    inventory: [null, null],
                });
            });
        });

        it('should add item to player when moving to tile with non-Home item', async () => {
            const mockItem = {
                name: 'TestItem',
                id: 'test-item',
                imageSrc: 'test.png',
                imageSrcGrey: 'test-grey.png',
                description: 'Test item',
                itemCounter: 0,
            } as Item;

            const tileWithItem = { ...MOCK_TILE, item: mockItem };
            testMovementPath = [MOCK_TILE, tileWithItem];

            const gameSession = gameSessionService.getGameSession(ACCESS_CODE);
            gameSession.game.grid = [
                [testMovementPath[0], testMovementPath[1]],
                [MOCK_TILE, MOCK_TILE],
            ];

            const addItemSpy = jest.spyOn(gameSessionService as any, 'addItemToPlayer');

            const updatePromise = gameSessionService.updatePlayerPosition(ACCESS_CODE, testMovementPath, testPlayer);
            await jest.advanceTimersByTimeAsync(PLAYER_MOVE_DELAY);
            await updatePromise;

            expect(addItemSpy).toHaveBeenCalledWith(ACCESS_CODE, testPlayer, mockItem, gameSession);
        });

        describe('updatePlayerPosition with Swap item', () => {
            it('should add/remove swap effects when moving on/off ice tiles', async () => {
                const startTile: Tile = {
                    ...MOCK_TILE,
                    id: 'start-tile',
                    type: TileType.Default,
                };

                const iceTile: Tile = {
                    ...MOCK_TILE,
                    id: 'ice-tile',
                    type: TileType.Ice,
                };

                const regularTile: Tile = {
                    ...MOCK_TILE,
                    id: 'regular-tile',
                    type: TileType.Default,
                };

                testMovementPath = [startTile, iceTile, regularTile];

                const gameGrid: Tile[][] = [
                    [startTile, iceTile],
                    [regularTile, MOCK_TILE],
                ];

                const swapItem: Item = {
                    name: ItemName.Swap,
                    id: 'swap-item',
                    imageSrc: 'swap.png',
                    imageSrcGrey: 'swap-grey.png',
                    description: 'Swap item',
                    itemCounter: 0,
                };

                const testPlayerWithSwap: Player = {
                    ...testPlayer,
                    inventory: [swapItem, null],
                };

                gameSessionService['gameSessions'].set(ACCESS_CODE, {
                    game: {
                        ...MOCK_LOBBY.game,
                        grid: gameGrid,
                    },
                    turn: createMockTurn(),
                });

                const updatePromise = gameSessionService.updatePlayerPosition(ACCESS_CODE, testMovementPath, testPlayerWithSwap);

                await jest.advanceTimersByTimeAsync(PLAYER_MOVE_DELAY);
                expect(itemService.addEffect).toHaveBeenCalledWith(
                    testPlayerWithSwap,
                    swapItem,
                    expect.objectContaining({
                        id: 'ice-tile',
                        type: TileType.Ice,
                    }),
                );

                await jest.advanceTimersByTimeAsync(PLAYER_MOVE_DELAY);
                await updatePromise;
                expect(itemService.removeEffects).toHaveBeenCalledWith(testPlayerWithSwap, 0);
            });
        });

        describe('updatePlayerPosition flag capture', () => {
            it('should end game with team members when capturing flag on home spawn', async () => {
                const accessCode = ACCESS_CODE;
                const team = TeamType.RED;
                const homeItem: Item = {
                    name: ItemName.Home,
                    id: 'home-item',
                    imageSrc: 'home.png',
                    imageSrcGrey: 'home-grey.png',
                    description: 'Spawn point',
                    itemCounter: 0,
                };

                const flagItem: Item = {
                    name: ItemName.Flag,
                    id: 'flag-item',
                    imageSrc: 'flag.png',
                    imageSrcGrey: 'flag-grey.png',
                    description: 'Team flag',
                    itemCounter: 0,
                };

                const homeSpawnTile: Tile = { ...MOCK_TILE, item: homeItem };
                const startTile: Tile = { ...MOCK_TILE };
                const gameGrid: Tile[][] = [[homeSpawnTile, startTile]];

                const movingPlayer: Player = {
                    ...testPlayer,
                    name: 'FlagCarrier',
                    team,
                    inventory: [flagItem, null],
                };

                const sameTeamPlayer: Player = {
                    ...createValidPlayer('Teammate', 5, false),
                    team,
                };

                let currentPlayerTile = startTile;
                jest.spyOn(gridManagerService, 'isFlagOnSpawnPoint').mockImplementation(() => {
                    return currentPlayerTile.item?.name === ItemName.Home && movingPlayer.inventory.some((i) => i?.name === ItemName.Flag);
                });

                gameSessionService.createGameSession(accessCode, GameMode.CTF);
                const session = gameSessionService.getGameSession(accessCode);
                session.turn.orderedPlayers = [movingPlayer, sameTeamPlayer];
                session.game.grid = gameGrid;

                const endGameSpy = jest.spyOn(gameSessionService, 'endGameSession');
                const updatePromise = gameSessionService.updatePlayerPosition(accessCode, [startTile, homeSpawnTile], movingPlayer);

                gameGrid[0][0].player = movingPlayer;
                currentPlayerTile = homeSpawnTile;

                await jest.advanceTimersByTimeAsync(PLAYER_MOVE_DELAY * 2);
                await updatePromise;

                expect(endGameSpy).toHaveBeenCalledWith(accessCode, [movingPlayer.name, sameTeamPlayer.name]);
            });
        });

        it('should return early if gameSession is not found when updating door tile', () => {
            const accessCode = 'non-existent-code';
            const previousTile = CLOSED_DOOR_TILE;
            const newTile = OPEN_DOOR_TILE;

            const gridManagerSpy = jest.spyOn(gridManagerService, 'updateDoorTile');

            const gameSessions = new Map<string, GameSession>();
            gameSessionService['gameSessions'] = gameSessions;
            const player = createValidPlayer(PLAYER_1_NAME, SLOW_SPEED, false) as VirtualPlayer;

            gameSessionService.updateDoorTile(accessCode, previousTile, newTile, player);

            expect(gridManagerSpy).not.toHaveBeenCalled();
        });
    });

    describe('isPlayerInGame', () => {
        it('should return false for non-existent access code', () => {
            const result = gameSessionService.isPlayerInGame('invalid-code', PLAYER_1_NAME);
            expect(result).toBe(false);
        });

        it('should return true if player exists in session', () => {
            const session = gameSessionService.getGameSession(ACCESS_CODE);
            session.turn.orderedPlayers = [createValidPlayer(PLAYER_1_NAME, 5, true)];

            const result = gameSessionService.isPlayerInGame(ACCESS_CODE, PLAYER_1_NAME);
            expect(result).toBe(true);
        });

        it('should return false if player not in session', () => {
            const session = gameSessionService.getGameSession(ACCESS_CODE);
            session.turn.orderedPlayers = [createValidPlayer(PLAYER_1_NAME, 5, true)];

            const result = gameSessionService.isPlayerInGame(ACCESS_CODE, 'NonExistentPlayer');
            expect(result).toBe(false);
        });
    });
});
