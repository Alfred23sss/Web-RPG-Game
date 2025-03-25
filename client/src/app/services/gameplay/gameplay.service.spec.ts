import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/gameData';
import { DiceType, ImageType, Routes, TileType } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { GameplayService } from './gameplay.service';

describe('GameplayService', () => {
    let service: GameplayService;
    let mockPlayerMovementService: jasmine.SpyObj<PlayerMovementService>;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
    let mockRouter: jasmine.SpyObj<Router>;

    const createMockGameData = (overrides: Partial<GameData> = {}): GameData => {
        const mockGameData = new GameData();

        Object.assign(mockGameData, {
            lobby: {
                accessCode: 'TEST123',
                isLocked: false,
                game: null,
                players: [],
                maxPlayers: 2,
            },
            game: {
                id: 'akakak',
                name: 'yo',
                mode: 'la',
                size: '2',
                lastModified: new Date(),
                isVisible: true,
                previewImage: ImageType.Default,
                description: 'al',
                grid: [
                    [
                        {
                            id: 'tile1',
                            player: createMockPlayer(),
                            imageSrc: ImageType.Default,
                            isOccupied: false,
                            type: TileType.Door,
                            isOpen: false,
                        },
                        {
                            id: 'tile2',
                            player: createMockPlayer(),
                            imageSrc: ImageType.Default,
                            isOccupied: false,
                            type: TileType.Door,
                            isOpen: false,
                        },
                    ],
                ],
            },
            clientPlayer: createMockPlayer(),
            currentPlayer: createMockPlayer(),
            availablePath: [],
            quickestPath: undefined,
            playerTile: undefined,
            attackResult: null,
            isActionMode: false,
            isCurrentlyMoving: false,
            isInCombatMode: false,
            turnTimer: 0,
            hasTurnEnded: false,
            isDebugMode: false,
            escapeAttempts: 0,
            evadeResult: null,
            movementPointsRemaining: 2,
            ...overrides,
        });

        return mockGameData;
    };

    // Comprehensive createMockPlayer function
    const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
        name: 'TestPlayer',
        avatar: 'default-avatar',
        speed: 5,
        attack: {
            value: 3,
            bonusDice: DiceType.D4,
        },
        defense: {
            value: 2,
            bonusDice: DiceType.D6,
        },
        hp: {
            current: 10,
            max: 10,
        },
        movementPoints: 5,
        actionPoints: 2,
        inventory: [null, null],
        isAdmin: false,
        hasAbandoned: false,
        isActive: true,
        combatWon: 0,
        spawnPoint: undefined,
        ...overrides,
    });

    beforeEach(() => {
        const playerMovementSpy = jasmine.createSpyObj('PlayerMovementService', [
            'availablePath',
            'hasAdjacentIce',
            'hasAdjacentPlayerOrDoor',
            'quickestPath',
        ]);
        const socketClientSpy = jasmine.createSpyObj('SocketClientService', ['emit', 'sendPlayerMovementUpdate']);
        const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showMessage']);
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            providers: [
                GameplayService,
                { provide: PlayerMovementService, useValue: playerMovementSpy },
                { provide: SocketClientService, useValue: socketClientSpy },
                { provide: SnackbarService, useValue: snackbarSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });

        service = TestBed.inject(GameplayService);
        mockPlayerMovementService = TestBed.inject(PlayerMovementService) as jasmine.SpyObj<PlayerMovementService>;
        mockSocketClientService = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        mockSnackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
        mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('endTurn', () => {
        it('should mark turn as ended and emit endTurn event', () => {
            const gameData = createMockGameData();
            service.endTurn(gameData);

            expect(gameData.hasTurnEnded).toBe(true);
            expect(gameData.turnTimer).toBe(0);
            expect(mockSocketClientService.emit).toHaveBeenCalledWith('endTurn', { accessCode: 'TEST123' });
        });
    });

    describe('abandonGame', () => {
        it('should mark player as abandoned and navigate to home', () => {
            const gameData = createMockGameData();
            service.abandonGame(gameData);

            expect(gameData.clientPlayer.hasAbandoned).toBe(true);
            expect(mockSocketClientService.emit).toHaveBeenCalledWith('abandonedGame', {
                player: gameData.clientPlayer,
                accessCode: 'TEST123',
            });
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.HomePage]);
        });
    });

    describe('getClientPlayerPosition', () => {
        it('should return the tile with the client player', () => {
            const gameData = createMockGameData();
            const playerTile = service.getClientPlayerPosition(gameData);

            expect(playerTile).toBeTruthy();
            expect(playerTile?.id).toBe('tile1');
            expect(playerTile?.player?.name).toBe('Player1');
        });

        it('should return undefined if game is undefined', () => {
            const gameData = {
                game: undefined,
                clientPlayer: { name: 'Player1' },
            } as unknown as GameData;

            const playerTile = service.getClientPlayerPosition(gameData);

            expect(playerTile).toBeUndefined();
        });

        it('should return undefined if client player is not found in grid', () => {
            const gameData = createMockGameData();
            gameData.clientPlayer.name = 'UnknownPlayer';

            const playerTile = service.getClientPlayerPosition(gameData);

            expect(playerTile).toBeUndefined();
        });
    });

    describe('checkAvailableActions', () => {
        it('should end turn when no action points and no adjacent action', () => {
            const gameData = createMockGameData();
            gameData.clientPlayer.actionPoints = 0;
            gameData.clientPlayer.movementPoints = 0;

            mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
            mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);

            spyOn(service, 'endTurn');
            service.checkAvailableActions(gameData);

            expect(service.endTurn).toHaveBeenCalledWith(gameData);
        });
    });

    describe('handleTileClick', () => {
        it('should send player movement update when not in action mode', () => {
            const gameData = createMockGameData();

            // Ensure grid is defined and typed correctly
            const grid = gameData.game?.grid ?? [];
            const currentTile = grid[0][0] as Tile;
            const targetTile = grid[0][1] as Tile;

            service.handleTileClick(gameData, targetTile);

            expect(mockSocketClientService.sendPlayerMovementUpdate).toHaveBeenCalledWith(currentTile, targetTile, 'TEST123', grid);
        });

        it('should not send movement update when game or grid is undefined', () => {
            const gameData: GameData = createMockGameData();

            service.handleTileClick(gameData, {} as Tile);

            expect(mockSocketClientService.sendPlayerMovementUpdate).not.toHaveBeenCalled();
        });

        it('should not send movement update when in action mode', () => {
            const gameData = createMockGameData();
            gameData.isActionMode = true;

            const grid = gameData.game?.grid ?? [];
            const targetTile = grid[0][1] as Tile;

            service.handleTileClick(gameData, targetTile);

            expect(mockSocketClientService.sendPlayerMovementUpdate).not.toHaveBeenCalled();
        });
    });

    describe('executeNextAction', () => {
        it('should toggle action mode and show snackbar message', () => {
            const gameData = createMockGameData();
            service.executeNextAction(gameData);

            expect(gameData.isActionMode).toBe(true);
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('Mode action activé');

            service.executeNextAction(gameData);
            expect(gameData.isActionMode).toBe(false);
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('Mode action désactivé');
        });
    });

    describe('updateAttackResult', () => {
        it('should update the attackResult in gameData', () => {
            const gameData = {} as GameData;
            const mockData = { success: true, attackScore: 5, defenseScore: 3 };

            service.updateAttackResult(gameData, mockData);

            expect(gameData.attackResult).toEqual(mockData);
        });
    });
});
