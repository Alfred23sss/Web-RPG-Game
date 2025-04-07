/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { GameMode, TileType } from '@app/enums/enums';
import { DiceType } from '@app/interfaces/Dice';
import { Game } from '@app/interfaces/Game';
import { GameSession } from '@app/interfaces/GameSession';
import { Item } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { Turn } from '@app/interfaces/Turn';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { GameStatisticsService } from './game-statistics.service';

const PLAYER_1_NAME = 'Player 1';
const PLAYER_2_NAME = 'Player 2';

describe('GameStatisticsService', () => {
    let service: GameStatisticsService;
    let eventEmitter: EventEmitter2;
    let gridManager: GridManagerService;
    let logger: Logger;

    const mockAccessCode = 'test123';

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

    const mockPlayer1: Player = createValidPlayer(PLAYER_1_NAME, 5, true);
    const mockPlayer2: Player = createValidPlayer(PLAYER_2_NAME, 7, false);

    const mockTile: Tile = {
        id: 'tile1',
        imageSrc: 'floor.png',
        isOccupied: false,
        type: TileType.Default,
        isOpen: true,
    };

    const mockGrid: Tile[][] = [[mockTile]];

    const mockGame: Game = {
        id: 'game1',
        name: 'Test Game',
        size: 'small',
        mode: GameMode.Classic,
        lastModified: new Date(),
        isVisible: true,
        previewImage: 'preview.png',
        description: 'Test game description',
        grid: mockGrid,
    };

    const mockGameSession: GameSession = {
        game: mockGame,
        turn: createMockTurn(),
    };

    const mockItem: Item = {
        id: '1',
        imageSrc: 'key.png',
        imageSrcGrey: 'key-grey.png',
        name: 'Golden Key',
        itemCounter: 1,
        description: 'Opens magical doors',
        originalReference: undefined,
        modifiers: [],
        isActive: true,
    };

    const mockFlag: Item = {
        id: '2',
        imageSrc: 'flag.png',
        imageSrcGrey: 'flag-grey.png',
        name: 'Victory Flag',
        itemCounter: 1,
        description: 'Capture to win the game',
        originalReference: undefined,
        modifiers: [],
        isActive: true,
    };

    beforeEach(async () => {
        jest.spyOn(global.Date, 'now').mockImplementation(() => 1672531200000);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameStatisticsService,
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                        on: jest.fn(),
                        removeAllListeners: jest.fn(),
                    },
                },
                {
                    provide: GridManagerService,
                    useValue: {
                        countDoors: jest.fn().mockReturnValue(5),
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

        service = module.get<GameStatisticsService>(GameStatisticsService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
        gridManager = module.get<GridManagerService>(GridManagerService);
        logger = module.get<Logger>(Logger);

        service.handleGameStarted({
            accessCode: mockAccessCode,
            players: [mockPlayer1, mockPlayer2],
            gameSession: mockGameSession,
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('event handlers', () => {
        it('should handle turn started events', () => {
            service.handleTurnStarted({
                accessCode: mockAccessCode,
                player: mockPlayer1,
            });

            const stats = service.getGameStatistics(mockAccessCode);
            expect(stats?.globalStats.totalTurns).toBe(1);
        });

        it('should handle combat started events', () => {
            service.handleCombatStarted({
                accessCode: mockAccessCode,
                attacker: mockPlayer1,
                defender: mockPlayer2,
                currentPlayerName: mockPlayer1.name,
            });

            const stats = service.getGameStatistics(mockAccessCode);
            expect(stats?.playerStats.get(mockPlayer1.name).combats).toBe(1);
            expect(stats?.playerStats.get(mockPlayer2.name).combats).toBe(1);
        });

        it('should handle combat ended events with evasion', () => {
            service.handleCombatEnded({
                accessCode: mockAccessCode,
                attacker: mockPlayer1,
                defender: mockPlayer2,
                currentFighter: mockPlayer2,
                hasEvaded: true,
            });

            const stats = service.getGameStatistics(mockAccessCode);
            expect(stats?.playerStats.get(mockPlayer2.name).escapes).toBe(1);
        });

        it('should handle combat ended events with victory', () => {
            service.handleCombatEnded({
                accessCode: mockAccessCode,
                attacker: mockPlayer1,
                defender: mockPlayer2,
                currentFighter: mockPlayer1,
                hasEvaded: false,
            });

            const stats = service.getGameStatistics(mockAccessCode);
            expect(stats?.playerStats.get(mockPlayer1.name).victories).toBe(1);
            expect(stats?.playerStats.get(mockPlayer2.name).defeats).toBe(1);
        });

        it('should handle combat attack result events', () => {
            service.handleCombatResult({
                accessCode: mockAccessCode,
                currentFighter: mockPlayer1,
                defenderPlayer: mockPlayer2,
                attackSuccessful: true,
                attackerScore: 8,
                defenseScore: 3,
            });

            const stats = service.getGameStatistics(mockAccessCode);
            expect(stats?.playerStats.get(mockPlayer2.name).healthLost).toBe(5); // 8 - 3 = 5
            expect(stats?.playerStats.get(mockPlayer1.name).damageCaused).toBe(5);
        });

        it('should not update health stats when attack is unsuccessful', () => {
            service.handleCombatResult({
                accessCode: mockAccessCode,
                currentFighter: mockPlayer1,
                defenderPlayer: mockPlayer2,
                attackSuccessful: false,
                attackerScore: 2,
                defenseScore: 5,
            });

            const stats = service.getGameStatistics(mockAccessCode);
            expect(stats?.playerStats.get(mockPlayer2.name).healthLost).toBe(0);
            expect(stats?.playerStats.get(mockPlayer1.name).damageCaused).toBe(0);
        });

        it('should handle item collection events', () => {
            service.handleItemCollected({
                accessCode: mockAccessCode,
                item: mockItem,
                player: mockPlayer1,
            });

            const stats = service.getGameStatistics(mockAccessCode);
            expect(stats?.playerStats.get(mockPlayer1.name).uniqueItemsCollected.has(mockItem.name)).toBeTruthy();
        });

        it('should handle flag collection events', () => {
            const flagItem = { ...mockItem, name: 'flag' };

            service.handleItemCollected({
                accessCode: mockAccessCode,
                item: flagItem,
                player: mockPlayer1,
            });

            const stats = service.calculateStats(mockAccessCode);
            expect(stats?.globalStats.uniqueFlagHolders).toBe(1);
        });

        it('should handle door manipulated events', () => {
            service.handleDoorManipulated({
                accessCode: mockAccessCode,
                tile: mockTile,
            });

            const stats = service.calculateStats(mockAccessCode);
            expect(stats?.globalStats.doorsManipulatedPercentage).toBeGreaterThan(0);
        });
    });

    describe('calculation methods', () => {
        it('should calculate game statistics correctly', () => {
            service.handleTurnStarted({ accessCode: mockAccessCode, player: mockPlayer1 });
            service.handleTrackTileVisited({ accessCode: mockAccessCode, player: mockPlayer1, tile: mockTile });

            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + 65000);

            jest.spyOn(global, 'Date')
                .mockImplementationOnce(() => startTime as any)
                .mockImplementationOnce(() => endTime as any);

            const stats = service.calculateStats(mockAccessCode);

            expect(stats).toBeDefined();
            expect(stats?.globalStats.gameDuration).toBeGreaterThanOrEqual(0);
            expect(stats?.globalStats.formattedDuration).toMatch(/^\d{2}:\d{2}$/);
            expect(stats?.globalStats.totalTurns).toBe(1);
        });

        it('should handle calculating percentages when totals are zero', () => {
            jest.spyOn(gridManager, 'countDoors').mockReturnValueOnce(0);

            service.handleGameStarted({
                accessCode: 'zeroDoors',
                players: [mockPlayer1, mockPlayer2],
                gameSession: mockGameSession,
            });

            const stats = service.calculateStats('zeroDoors');

            expect(stats?.globalStats.doorsManipulatedPercentage).toBe(0);
        });

        it('should clean up statistics when requested', () => {
            service.cleanUp(mockAccessCode);
            expect(service.getGameStatistics(mockAccessCode)).toBeUndefined();
        });

        it('should return undefined when calculating stats for non-existent game', () => {
            const stats = service.calculateStats('nonexistent');
            expect(stats).toBeUndefined();
        });
    });

    describe('data structures', () => {
        it('should not collect duplicate items', () => {
            service.handleItemCollected({
                accessCode: mockAccessCode,
                item: mockItem,
                player: mockPlayer1,
            });

            service.handleItemCollected({
                accessCode: mockAccessCode,
                item: mockItem,
                player: mockPlayer1,
            });

            const stats = service.getGameStatistics(mockAccessCode);
            expect(stats?.playerStats.get(mockPlayer1.name).uniqueItemsCollected.size).toBe(1);
        });

        it('should track flag holders correctly', () => {
            const flagItem = { ...mockItem, name: 'flag' };

            service.handleItemCollected({
                accessCode: mockAccessCode,
                item: flagItem,
                player: mockPlayer1,
            });

            service.handleItemCollected({
                accessCode: mockAccessCode,
                item: flagItem,
                player: mockPlayer2,
            });

            const stats = service.calculateStats(mockAccessCode);
            expect(stats?.globalStats.uniqueFlagHolders).toBe(2);
        });
    });

    describe('edge cases', () => {
        it('should handle events for non-existent game sessions gracefully', () => {
            expect(() => {
                service.handleTurnStarted({
                    accessCode: 'nonexistent',
                    player: mockPlayer1,
                });
            }).not.toThrow();
        });

        it('should handle null tile in tile visited event', () => {
            expect(() => {
                service.handleTrackTileVisited({
                    accessCode: mockAccessCode,
                    player: mockPlayer1,
                    tile: null as unknown as Tile,
                });
            }).not.toThrow();
        });
    });

    it('should handle tile visited events', () => {
        const gameStats = service.getGameStatistics(mockAccessCode);
        if (gameStats) {
            gameStats.gridSize = 1;
        }

        service.handleTrackTileVisited({
            accessCode: mockAccessCode,
            player: mockPlayer1,
            tile: mockTile,
        });

        const stats = service.calculateStats(mockAccessCode);
        expect(stats?.playerStats.get(mockPlayer1.name).tilesVisitedPercentage).toBeGreaterThan(0);
    });

    it('should calculate game statistics correctly', () => {
        service.handleTurnStarted({ accessCode: mockAccessCode, player: mockPlayer1 });
        service.handleTrackTileVisited({ accessCode: mockAccessCode, player: mockPlayer1, tile: mockTile });

        const gameStats = service.getGameStatistics(mockAccessCode);
        if (gameStats) {
            const now = Date.now();
            gameStats.startTime = new Date(now - 65000);
            gameStats.endTime = new Date(now);
        }

        const stats = service.calculateStats(mockAccessCode);

        expect(stats).toBeDefined();
        expect(stats?.globalStats.gameDuration).toBeGreaterThanOrEqual(0);
        expect(stats?.globalStats.totalTurns).toBe(1);
    });

    it('should handle calculating percentages when totals are zero', () => {
        jest.spyOn(gridManager, 'countDoors').mockReturnValueOnce(0);

        service.handleGameStarted({
            accessCode: 'zeroDoors',
            players: [mockPlayer1, mockPlayer2],
            gameSession: mockGameSession,
        });

        const zeroDoorsStats = service.getGameStatistics('zeroDoors');
        if (zeroDoorsStats) {
            zeroDoorsStats.startTime = new Date();
        }

        const stats = service.calculateStats('zeroDoors');

        expect(stats?.globalStats.doorsManipulatedPercentage).toBe(0);
    });

    it('should track flag holders correctly', () => {
        const flagItem = { ...mockItem, name: 'flag' };

        const gameStats = service.getGameStatistics(mockAccessCode);
        if (gameStats) {
            gameStats.startTime = new Date();
        }

        service.handleItemCollected({
            accessCode: mockAccessCode,
            item: flagItem,
            player: mockPlayer1,
        });

        service.handleItemCollected({
            accessCode: mockAccessCode,
            item: flagItem,
            player: mockPlayer2,
        });

        const stats = service.calculateStats(mockAccessCode);
        expect(stats?.globalStats.uniqueFlagHolders).toBe(2);
    });
});
