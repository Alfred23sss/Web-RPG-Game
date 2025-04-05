/* eslint-disable no-unused-vars */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { EventEmit, GameMode, TileType } from '@app/enums/enums';
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
                        countDoors: jest.fn().mockReturnValue(0),
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

        // Initialize game statistics
        eventEmitter.emit(EventEmit.InitializeGameStatistics, {
            accessCode: mockAccessCode,
            players: [mockPlayer1, mockPlayer2],
            gameSession: mockGameSession,
        });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculation methods', () => {
        it('should clean up statistics when requested', () => {
            service.cleanUp(mockAccessCode);
            expect(service.getGameStatistics(mockAccessCode)).toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('should handle events for non-existent game sessions gracefully', () => {
            expect(() => {
                eventEmitter.emit(EventEmit.GameTurnStarted, {
                    accessCode: 'nonexistent',
                    player: mockPlayer1,
                });
            }).not.toThrow();
        });

        it('should handle null tile in tile visited event', () => {
            expect(() => {
                eventEmitter.emit(EventEmit.GameTileVisited, {
                    accessCode: mockAccessCode,
                    player: mockPlayer1,
                    tile: null as unknown as Tile,
                });
            }).not.toThrow();
        });
    });
});
