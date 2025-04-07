/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/gameData';
import { DiceType, ImageType, Routes, TileType } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
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
                accessCode: '1234',
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
            isGameEnding: false,
            movementPointsRemaining: 2,
            ...overrides,
        });

        return mockGameData;
    };

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
        isVirtual: false,
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
                MatDialog,
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
            expect(mockSocketClientService.emit).toHaveBeenCalledWith('endTurn', { accessCode: '1234' });
        });
    });

    describe('abandonGame', () => {
        it('should mark player as abandoned and navigate to home', () => {
            const mockPlayer = createMockPlayer();
            const mockGameData = createMockGameData({
                clientPlayer: mockPlayer,
                lobby: { accessCode: '1234' } as unknown as Lobby,
            });
            (service as any)['gameData'] = mockGameData;

            service.abandonGame(mockGameData);

            expect(mockPlayer.hasAbandoned).toBeTrue();
            expect(mockSocketClientService.emit).toHaveBeenCalledWith(
                'abandonedGame',
                jasmine.objectContaining({
                    player: jasmine.objectContaining({
                        name: 'TestPlayer',
                        hasAbandoned: true,
                    }),
                    accessCode: '1234',
                }),
            );
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.HomePage]);
        });
    });

    describe('getClientPlayerPosition', () => {
        it('should return the tile with the client player', () => {
            const gameData = createMockGameData();
            const playerTile = service.getClientPlayerPosition(gameData);

            expect(playerTile).toBeTruthy();
            expect(playerTile?.id).toBe('tile1');
            expect(playerTile?.player?.name).toBe('TestPlayer');
        });

        it('should return undefined if client player is not found in grid', () => {
            const gameData = createMockGameData();
            gameData.clientPlayer.name = 'UnknownPlayer';

            const playerTile = service.getClientPlayerPosition(gameData);

            expect(playerTile).toBeUndefined();
        });
    });

    describe('handleTileClick', () => {
        it('should send player movement update when not in action mode', () => {
            const gameData = createMockGameData();

            const grid = gameData.game?.grid ?? [];
            const currentTile = grid[0][0] as Tile;
            const targetTile = grid[0][1] as Tile;

            service.handleTileClick(gameData, targetTile);

            expect(mockSocketClientService.sendPlayerMovementUpdate).toHaveBeenCalledWith(currentTile, targetTile, '1234', grid);
        });

        it('should not send movement update when game or grid is undefined', () => {
            const gameData: GameData = createMockGameData();
            gameData.game.grid = undefined;

            service.handleTileClick(gameData, {} as Tile);

            expect(mockSocketClientService.sendPlayerMovementUpdate).not.toHaveBeenCalled();
        });

        it('should return immediately when in action mode', () => {
            const gameData = createMockGameData({
                isActionMode: true,
                isCurrentlyMoving: false,
            });
            const targetTile = gameData.game?.grid?.[0][1] as Tile;

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

    it('should call playerMovementService.availablePath with correct parameters', () => {
        const gameData = createMockGameData();
        spyOn(service, 'getClientPlayerPosition');

        service.updateAvailablePath(gameData);

        expect(mockPlayerMovementService.availablePath).toHaveBeenCalled();
    });

    it('should set availablePath to an empty array when the current player is not the client', () => {
        const gameData = createMockGameData({ currentPlayer: createMockPlayer({ name: 'OtherPlayer' }) });

        service.updateAvailablePath(gameData);

        expect(gameData.availablePath).toEqual([]);
        expect(mockPlayerMovementService.availablePath).not.toHaveBeenCalled();
    });

    it('should set availablePath to an empty array when game or grid is undefined', () => {
        const gameData = createMockGameData({ game: undefined });

        service.updateAvailablePath(gameData);

        expect(gameData.availablePath).toEqual([]);
        expect(mockPlayerMovementService.availablePath).not.toHaveBeenCalled();
    });

    it('should return false when availablePath is undefined', () => {
        const gameData = createMockGameData({ availablePath: undefined });
        const targetTile = { id: 'tile1' } as Tile;
        service.updateQuickestPath(gameData, targetTile);
        expect(gameData.quickestPath).toBeUndefined();
    });

    describe('getClientPlayerPosition', () => {
        it('should return the tile with the client player', () => {
            const gameData = createMockGameData();
            const playerTile = service.getClientPlayerPosition(gameData);

            expect(playerTile).toBeTruthy();
            expect(playerTile?.id).toBe('tile1');
            expect(playerTile?.player?.name).toBe('TestPlayer');
        });

        it('should return undefined if client player is not found in grid', () => {
            const gameData = createMockGameData();
            gameData.clientPlayer.name = 'UnknownPlayer';

            const playerTile = service.getClientPlayerPosition(gameData);

            expect(playerTile).toBeUndefined();
        });
    });

    // describe('checkAvailableActions', () => {
    //     // it('should end turn when no action points and no adjacent action', () => {
    //     //     const gameData = createMockGameData();
    //     //     gameData.clientPlayer.actionPoints = 0;
    //     //     gameData.clientPlayer.movementPoints = 0;
    //     //     mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
    //     //     mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
    //     //     spyOn(service, 'endTurn');
    //     //     service.checkAvailableActions(gameData);
    //     //     expect(service.endTurn).toHaveBeenCalledWith(gameData);
    //     // });
    //     // it('should end turn when 1 action point and no movement, with no adjacent ice or actions', () => {
    //     //     const gameData = createMockGameData();
    //     //     gameData.clientPlayer.actionPoints = 1;
    //     //     gameData.clientPlayer.movementPoints = 0;
    //     //     mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
    //     //     mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
    //     //     spyOn(service, 'endTurn');
    //     //     service.checkAvailableActions(gameData);
    //     //     expect(service.endTurn).toHaveBeenCalledWith(gameData);
    //     // });
    //     // it('should return early when clientPlayerPosition is undefined', () => {
    //     //     const gameData = createMockGameData();
    //     //     spyOn(service, 'getClientPlayerPosition').and.returnValue(undefined);
    //     //     spyOn(service, 'endTurn');
    //     //     service.checkAvailableActions(gameData);
    //     //     expect(service.endTurn).not.toHaveBeenCalled();
    //     //     expect(mockPlayerMovementService.hasAdjacentIce).not.toHaveBeenCalled();
    //     //     expect(mockPlayerMovementService.hasAdjacentPlayerOrDoor).not.toHaveBeenCalled();
    //     // });
    // });

    it('should not handle door click when in combat mode', () => {
        const gameData = createMockGameData({ isInCombatMode: true });
        const targetTile = gameData.game?.grid?.[0][0] as Tile;

        service.handleDoorClick(gameData, targetTile);

        expect(mockSocketClientService.emit).not.toHaveBeenCalled();
    });

    it('should not handle door click when no action points', () => {
        const gameData = createMockGameData({
            clientPlayer: createMockPlayer({ actionPoints: 0 }),
            isActionMode: true,
        });
        const targetTile = gameData.game?.grid?.[0][0] as Tile;

        service.handleDoorClick(gameData, targetTile);

        expect(mockSocketClientService.emit).not.toHaveBeenCalled();
    });

    it('should not emit door update when currentTile is undefined', () => {
        const gameData = createMockGameData({
            isActionMode: true,
            clientPlayer: createMockPlayer({ actionPoints: 1 }),
        });
        spyOn(service, 'getClientPlayerPosition').and.returnValue(undefined);

        const targetTile = gameData.game?.grid?.[0][0] as Tile;
        service.handleDoorClick(gameData, targetTile);

        expect(mockSocketClientService.emit).not.toHaveBeenCalled();
    });

    it('should emit door update when conditions are met', () => {
        const gameData = createMockGameData({
            isActionMode: true,
            clientPlayer: createMockPlayer({ actionPoints: 1 }),
        });
        const targetTile = gameData.game?.grid?.[0][0] as Tile;

        service.handleDoorClick(gameData, targetTile);

        expect(mockSocketClientService.emit).toHaveBeenCalledWith('doorUpdate', {
            currentTile: gameData.game?.grid?.[0][0],
            targetTile,
            accessCode: '1234',
        });
    });

    describe('handleAttackClick', () => {
        it('should not handle attack on same player', () => {
            const gameData = createMockGameData({
                isActionMode: true,
                clientPlayer: createMockPlayer(),
            });
            const targetTile = gameData.game?.grid?.[0][0] as Tile;

            service.handleAttackClick(gameData, targetTile);

            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });

        it('should not handle attack when no action points', () => {
            const gameData = createMockGameData({
                isActionMode: true,
                clientPlayer: createMockPlayer({ actionPoints: 0 }),
            });
            const targetTile = gameData.game?.grid?.[0][1] as Tile;

            service.handleAttackClick(gameData, targetTile);

            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });

        it('should start combat when tiles are adjacent and conditions are met', () => {
            const gameData = createMockGameData({
                isActionMode: true,
                clientPlayer: createMockPlayer({ actionPoints: 1 }),
                isDebugMode: true,
            });

            const defenderTile = gameData.game?.grid?.[0][1] as Tile;
            defenderTile.player = createMockPlayer({ name: 'EnemyPlayer' });

            service.handleAttackClick(gameData, defenderTile);

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('startCombat', {
                attackerName: 'TestPlayer',
                defenderName: 'EnemyPlayer',
                accessCode: '1234',
                isDebugMode: true,
            });
        });

        it('should emit exactly once when attacking adjacent player', () => {
            const gameData = createMockGameData({
                isActionMode: true,
                clientPlayer: createMockPlayer({ actionPoints: 1 }),
            });
            const defenderTile = gameData.game?.grid?.[0][1] as Tile;
            defenderTile.player = createMockPlayer({ name: 'Enemy' });
            service.handleAttackClick(gameData, defenderTile);
            expect(mockSocketClientService.emit).toHaveBeenCalledOnceWith('startCombat', {
                attackerName: 'TestPlayer',
                defenderName: 'Enemy',
                accessCode: '1234',
                isDebugMode: false,
            });
        });
    });

    describe('handleTeleport', () => {
        it('should not teleport when in combat mode', () => {
            const gameData = createMockGameData({ isInCombatMode: true });
            const targetTile = gameData.game?.grid?.[0][0] as Tile;

            service.handleTeleport(gameData, targetTile);

            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });

        it('should emit teleport when current player is client player', () => {
            const gameData = createMockGameData();
            const targetTile = gameData.game?.grid?.[0][0] as Tile;

            service.handleTeleport(gameData, targetTile);

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('teleportPlayer', {
                accessCode: '1234',
                player: gameData.clientPlayer,
                targetTile,
            });
        });

        it('should not teleport when current player is not client player', () => {
            const gameData = createMockGameData({
                currentPlayer: createMockPlayer({ name: 'OtherPlayer' }),
            });
            const targetTile = gameData.game?.grid?.[0][0] as Tile;

            service.handleTeleport(gameData, targetTile);

            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });
    });

    describe('updateQuickestPath', () => {
        it('should clear quickest path when grid is undefined', () => {
            const gameData = createMockGameData({ game: undefined });
            const targetTile = { id: 'target' } as Tile;

            service.updateQuickestPath(gameData, targetTile);

            expect(gameData.quickestPath).toBeUndefined();
        });

        it('should clear quickest path when target tile is not in available path', () => {
            const gameData = createMockGameData({
                availablePath: [],
            });
            const targetTile = { id: 'target' } as Tile;

            service.updateQuickestPath(gameData, targetTile);

            expect(gameData.quickestPath).toBeUndefined();
        });

        it('should set empty array when quickestPath returns undefined', () => {
            const gameData = createMockGameData();
            const targetTile = gameData.game?.grid?.[0][1] as Tile;

            spyOn(service as any, 'isAvailablePath').and.returnValue(true);
            mockPlayerMovementService.quickestPath.and.returnValue(undefined);

            service.updateQuickestPath(gameData, targetTile);

            expect(gameData.quickestPath).toEqual([]);
        });
    });

    describe('attack and evade', () => {
        it('should emit performAttack with correct parameters', () => {
            const gameData = createMockGameData();

            service.attack(gameData);

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('performAttack', {
                accessCode: '1234',
                attackerName: 'TestPlayer',
            });
        });

        it('should emit evade with correct parameters', () => {
            const gameData = createMockGameData();

            service.evade(gameData);

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('evade', {
                accessCode: '1234',
                player: gameData.clientPlayer,
            });
        });
    });

    it('should emit adminModeUpdate when admin player presses "d"', () => {
        const gameData = createMockGameData({
            clientPlayer: createMockPlayer({ isAdmin: true }),
        });
        const event = new KeyboardEvent('keydown', { key: 'd' });

        service.handleKeyPress(gameData, event);

        expect(mockSocketClientService.emit).toHaveBeenCalledWith('adminModeUpdate', {
            accessCode: '1234',
        });
    });

    it('should not emit adminModeUpdate when non-admin player presses "d"', () => {
        const gameData = createMockGameData({
            clientPlayer: createMockPlayer({ isAdmin: false }),
        });
        const event = new KeyboardEvent('keydown', { key: 'd' });

        service.handleKeyPress(gameData, event);

        expect(mockSocketClientService.emit).not.toHaveBeenCalled();
    });

    it('should not emit adminModeUpdate when admin player presses different key', () => {
        const gameData = createMockGameData({
            clientPlayer: createMockPlayer({ isAdmin: true }),
        });
        const event = new KeyboardEvent('keydown', { key: 'x' });

        service.handleKeyPress(gameData, event);

        expect(mockSocketClientService.emit).not.toHaveBeenCalled();
    });

    describe('emitAdminModeUpdate', () => {
        it('should emit adminModeUpdate with correct access code', () => {
            const gameData = createMockGameData();

            service.emitAdminModeUpdate(gameData);

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('adminModeUpdate', {
                accessCode: '1234',
            });
        });
    });
    it('should return false when tiles not found', () => {
        const result = (service as any).findAndCheckAdjacentTiles('tile1', 'tile2', []);
        expect(result).toBeFalse();
    });

    describe('isAvailablePath', () => {
        it('should return true when tile is in availablePath', () => {
            const gameData = createMockGameData();
            const targetTile = { id: 'tile1' } as Tile;
            gameData.availablePath = [targetTile];

            const result = (service as any).isAvailablePath(gameData, targetTile);

            expect(result).toBeTrue();
        });

        it('should return false when tile is not in availablePath', () => {
            const gameData = createMockGameData();
            const targetTile = { id: 'tile3' } as Tile;
            gameData.availablePath = [{ id: 'tile1' } as Tile, { id: 'tile2' } as Tile];

            const result = (service as any).isAvailablePath(gameData, targetTile);

            expect(result).toBeFalse();
        });

        it('should return false when availablePath is empty', () => {
            const gameData = createMockGameData();
            const targetTile = { id: 'tile1' } as Tile;
            gameData.availablePath = [];

            const result = (service as any).isAvailablePath(gameData, targetTile);

            expect(result).toBeFalse();
        });

        it('should return false when availablePath is undefined', () => {
            const gameData = createMockGameData();
            const targetTile = { id: 'tile1' } as Tile;
            gameData.availablePath = undefined;

            const result = (service as any).isAvailablePath(gameData, targetTile);

            expect(result).toBeFalse();
        });
    });
});
