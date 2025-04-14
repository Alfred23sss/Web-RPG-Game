/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/game-data';
import { Item } from '@app/classes/item';
import { ItemPopUpComponent } from '@app/components/item-pop-up/item-pop-up.component';
import { DiceType, ImageType, ItemName, Routes, TileType } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { of } from 'rxjs';
import { GameplayService } from './gameplay.service';

describe('GameplayService', () => {
    let service: GameplayService;
    let mockPlayerMovementService: jasmine.SpyObj<PlayerMovementService>;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockMatDialog: jasmine.SpyObj<MatDialog>;
    let mockDialogRef: jasmine.SpyObj<any>;

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
            'hasAdjacentPlayerOrDoor',
            'quickestPath',
            'hasAdjacentTileType',
        ]);
        const socketClientSpy = jasmine.createSpyObj('SocketClientService', ['emit', 'sendPlayerMovementUpdate']);
        const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showMessage']);
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        const matDialogSpy = jasmine.createSpyObj('MatDialog', ['open', 'closeAll']);
        const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);

        TestBed.configureTestingModule({
            providers: [
                GameplayService,
                { provide: PlayerMovementService, useValue: playerMovementSpy },
                { provide: SocketClientService, useValue: socketClientSpy },
                { provide: SnackbarService, useValue: snackbarSpy },
                { provide: Router, useValue: routerSpy },
                { provide: MatDialog, useValue: matDialogSpy },
                { provide: MatDialogRef, useValue: dialogRefSpy },
            ],
        });

        service = TestBed.inject(GameplayService);
        mockPlayerMovementService = TestBed.inject(PlayerMovementService) as jasmine.SpyObj<PlayerMovementService>;
        mockSocketClientService = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        mockSnackbarService = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
        mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        mockMatDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
        mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<any>;
        mockMatDialog.open.and.returnValue(dialogRefSpy);
        mockDialogRef.afterClosed.and.returnValue(of(undefined));

        spyOn(service, 'handleItemDropped' as any);
        spyOn(service, 'checkAvailableActions');
        (mockMatDialog as any).openDialogs = [];
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('navigateToFinalPage', () => {
        it('should navigate to the game end page', () => {
            service.navigateToFinalPage();
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.GameEndPage], {});
        });
    });

    it('should return true when players are on the same team', () => {
        const gameData = createMockGameData({
            lobby: {
                accessCode: '1234',
                players: [
                    { name: 'Player1', team: 'red' },
                    { name: 'Player2', team: 'red' },
                    { name: 'Player3', team: 'blue' },
                    { name: 'Player4', team: 'blue' },
                    { name: 'NoTeamPlayer' },
                ] as unknown as Player[],
                maxPlayers: 4,
            } as Lobby,
        });
        const result = (service as any).isTeamate('Player1', 'Player2', gameData);
        expect(result).toBeTrue();
    });

    describe('handleAttackCTF', () => {
        let gameData: GameData;
        let targetTile: Tile;

        beforeEach(() => {
            gameData = createMockGameData({
                isActionMode: true,
                clientPlayer: createMockPlayer({ actionPoints: 1 }),
            });
            targetTile = gameData.game?.grid?.[0][1] as Tile;
            targetTile.player = createMockPlayer({ name: 'EnemyPlayer' });
        });

        it('should show message when attacking a teammate', () => {
            spyOn(service as any, 'isTeamate').and.returnValue(true);
            service.handleAttackCTF(gameData, targetTile);
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith("TRAITRE!!! C'EST MOI TON AMI");
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });

        it('should not attack when not in action mode', () => {
            gameData.isActionMode = false;
            service.handleAttackCTF(gameData, targetTile);
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });

        it('should not attack when targetTile does not have a player', () => {
            targetTile.player = undefined;
            service.handleAttackCTF(gameData, targetTile);
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });

        it('should emit startCombat when attacking adjacent enemy', () => {
            spyOn(service as any, 'isTeamate').and.returnValue(false);
            spyOn(service as any, 'findAndCheckAdjacentTiles').and.returnValue(true);

            service.handleAttackCTF(gameData, targetTile);

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('startCombat', {
                attackerName: gameData.clientPlayer.name,
                defenderName: 'EnemyPlayer',
                accessCode: '1234',
                isDebugMode: false,
            });
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });
    });

    describe('handleWallClick', () => {
        let gameData: GameData;
        let targetTile: Tile;
        let player: Player;

        beforeEach(() => {
            gameData = createMockGameData();
            targetTile = gameData.game?.grid?.[0][0] as Tile;
            player = createMockPlayer();
        });

        it('should emit wall update when conditions are met and player has lightning item', () => {
            gameData.isInCombatMode = false;
            gameData.clientPlayer.actionPoints = 1;
            gameData.isActionMode = true;
            gameData.clientPlayer.inventory = [{ id: '1', name: ItemName.Lightning } as Item, null];
            service.handleWallClick(gameData, targetTile, player);
            expect(mockSocketClientService.emit).toHaveBeenCalledWith('wallUpdate', {
                currentTile: gameData.game?.grid?.[0][0],
                targetTile,
                accessCode: '1234',
                player,
            });
        });

        it('should not handle wall click when in combat mode', () => {
            gameData.isInCombatMode = true;
            service.handleWallClick(gameData, targetTile, player);
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });

        it('should not handle wall click when current tile is undefined', () => {
            gameData.isInCombatMode = false;
            gameData.clientPlayer.actionPoints = 1;
            gameData.isActionMode = true;
            spyOn(service, 'getClientPlayerPosition').and.returnValue(undefined);
            service.handleWallClick(gameData, targetTile, player);
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });
    });

    describe('createItemPopUp', () => {
        const mockItems = [
            { id: '1', name: 'Flag', imageSrc: 'flag.png' } as Item,
            { id: '2', name: 'Sword', imageSrc: 'sword.png' } as Item,
            { id: '3', name: 'Sword', imageSrc: 'sword.png' } as Item,
        ] as [Item, Item, Item];
        const mockGameData = createMockGameData();

        it('should open dialog with correct parameters', () => {
            service.closePopUp();
            service.createItemPopUp(mockItems, mockGameData);

            expect(mockMatDialog.open).toHaveBeenCalledWith(
                ItemPopUpComponent,
                jasmine.objectContaining({
                    data: { items: mockItems },
                    panelClass: 'item-pop-up-dialog',
                    hasBackdrop: false,
                }),
            );
        });

        it('should handle item selection and update game state', () => {
            const selectedItem = mockItems[0];
            mockDialogRef.afterClosed.and.returnValue(of(selectedItem));

            service.createItemPopUp(mockItems, mockGameData);

            expect(service['handleItemDropped']).toHaveBeenCalledWith(mockGameData, selectedItem);
            expect(service.checkAvailableActions).toHaveBeenCalledWith(mockGameData);
        });
    });

    describe('closePopUp', () => {
        it('should close all open dialogs', () => {
            service.closePopUp();
            expect(mockMatDialog.closeAll).toHaveBeenCalled();
        });
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
            expect(mockSocketClientService.emit).toHaveBeenCalledWith('manualDisconnect', { isInGame: true });
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
            const mockData = {
                success: true,
                attackScore: {
                    value: 5,
                    bonusDice: DiceType.D6,
                    score: 8,
                    diceRolled: 4,
                },
                defenseScore: {
                    value: 3,
                    bonusDice: DiceType.D4,
                    score: 5,
                    diceRolled: 3,
                },
            };

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

        it('should call handleAttackCTF when game mode is CTF', () => {
            spyOn(service, 'handleAttackCTF' as any);

            const gameData = createMockGameData({
                isActionMode: true,
                clientPlayer: createMockPlayer({ actionPoints: 1 }),
            });
            gameData.game.mode = 'CTF';
            const defenderTile = gameData.game?.grid?.[0][1] as Tile;
            defenderTile.player = createMockPlayer({ name: 'Enemy' });
            service.handleAttackClick(gameData, defenderTile);
            expect(service.handleAttackCTF).toHaveBeenCalled();
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
        it('should emit itemDrop with correct parameters when handleItemDropped is called', () => {
            const mockGameData = createMockGameData();
            const mockItem = new Item();

            (service['handleItemDropped'] as jasmine.Spy).and.callThrough();

            service['handleItemDropped'](mockGameData, mockItem);

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('itemDrop', {
                accessCode: mockGameData.lobby.accessCode,
                player: mockGameData.clientPlayer,
                item: mockItem,
            });
        });
    });
    describe('checkAvailableActions', () => {
        let mockGameData: GameData;
        let mockTile: Tile;

        beforeEach(() => {
            mockTile = {
                id: 'test-tile',
                player: createMockPlayer(),
                imageSrc: ImageType.Default,
                isOccupied: true,
                type: TileType.Default,
                isOpen: false,
            };

            mockGameData = createMockGameData();

            mockGameData.game!.grid = mockGameData.game!.grid as Tile[][];

            (service.checkAvailableActions as jasmine.Spy).and.callThrough();

            spyOn(service, 'getClientPlayerPosition').and.returnValue(mockTile);
            spyOn(service, 'endTurn');

            Object.defineProperty(service, 'dialog', {
                get: () => ({
                    openDialogs: [],
                }),
            });
        });

        it('should return early if dialog is open', () => {
            Object.defineProperty(service, 'dialog', {
                get: () => ({
                    openDialogs: [{}],
                }),
            });
            service.checkAvailableActions(mockGameData);

            expect(service.getClientPlayerPosition).not.toHaveBeenCalled();
            expect(service.endTurn).not.toHaveBeenCalled();
        });

        it('should end turn when player has no action or movement points and no ice nearby', () => {
            mockGameData.clientPlayer.actionPoints = 0;
            mockGameData.clientPlayer.movementPoints = 0;
            mockPlayerMovementService.hasAdjacentTileType.and.returnValue(false);

            service.checkAvailableActions(mockGameData);

            expect(mockPlayerMovementService.hasAdjacentTileType).toHaveBeenCalledWith(mockTile, mockGameData.game!.grid as Tile[][], TileType.Ice);
            expect(service.endTurn).toHaveBeenCalledWith(mockGameData);
        });

        it('should not end turn when player has no action or movement points but has ice nearby', () => {
            mockGameData.clientPlayer.actionPoints = 0;
            mockGameData.clientPlayer.movementPoints = 0;
            mockPlayerMovementService.hasAdjacentTileType.and.callFake((tile, grid, type) => {
                return type === TileType.Ice;
            });

            service.checkAvailableActions(mockGameData);

            expect(mockPlayerMovementService.hasAdjacentTileType).toHaveBeenCalledWith(mockTile, mockGameData.game!.grid as Tile[][], TileType.Ice);
            expect(service.endTurn).not.toHaveBeenCalled();
        });

        // eslint-disable-next-line max-len
        it('should end turn with 1 action point and no movement points when there is no ice, no action available, and no lightning/wall combo', () => {
            mockGameData.clientPlayer.actionPoints = 1;
            mockGameData.clientPlayer.movementPoints = 0;
            mockPlayerMovementService.hasAdjacentTileType.and.returnValue(false);
            mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
            mockTile.player = createMockPlayer({
                inventory: [null, null],
            });

            service.checkAvailableActions(mockGameData);

            expect(mockPlayerMovementService.hasAdjacentPlayerOrDoor).toHaveBeenCalledWith(mockTile, mockGameData.game!.grid as Tile[][]);
            expect(service.endTurn).toHaveBeenCalledWith(mockGameData);
        });

        it('should not end turn with 1 action point and no movement points when there is ice nearby', () => {
            mockGameData.clientPlayer.actionPoints = 1;
            mockGameData.clientPlayer.movementPoints = 0;
            mockPlayerMovementService.hasAdjacentTileType.and.callFake((tile, grid, type) => {
                return type === TileType.Ice;
            });

            service.checkAvailableActions(mockGameData);
            expect(service.endTurn).not.toHaveBeenCalled();
        });

        it('should not end turn with 1 action point and no movement points when there is action available', () => {
            mockGameData.clientPlayer.actionPoints = 1;
            mockGameData.clientPlayer.movementPoints = 0;
            mockPlayerMovementService.hasAdjacentTileType.and.returnValue(false);
            mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(true);

            service.checkAvailableActions(mockGameData);

            expect(mockPlayerMovementService.hasAdjacentPlayerOrDoor).toHaveBeenCalledWith(mockTile, mockGameData.game!.grid as Tile[][]);
            expect(service.endTurn).not.toHaveBeenCalled();
        });

        it('should not end turn with 1 action point and no movement points when player has lightning and wall nearby', () => {
            mockGameData.clientPlayer.actionPoints = 1;
            mockGameData.clientPlayer.movementPoints = 0;
            mockTile.player = createMockPlayer({
                inventory: [{ name: ItemName.Lightning } as Item, null],
            });
            mockPlayerMovementService.hasAdjacentTileType.and.callFake((tile, grid, type) => {
                return type === TileType.Wall;
            });
            mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);

            service.checkAvailableActions(mockGameData);

            expect(mockPlayerMovementService.hasAdjacentTileType).toHaveBeenCalledWith(mockTile, mockGameData.game!.grid as Tile[][], TileType.Wall);
            expect(service.endTurn).not.toHaveBeenCalled();
        });

        it('should not end turn when player has movement points available', () => {
            mockGameData.clientPlayer.actionPoints = 0;
            mockGameData.clientPlayer.movementPoints = 1;

            service.checkAvailableActions(mockGameData);

            expect(service.endTurn).not.toHaveBeenCalled();
        });
        it('should return early if gameData.game is null', () => {
            mockGameData.game = undefined as any;

            service.checkAvailableActions(mockGameData);

            expect(service.getClientPlayerPosition).toHaveBeenCalledWith(mockGameData);
            expect(service.endTurn).not.toHaveBeenCalled();
        });

        it('should return early if gameData.game.grid is null', () => {
            mockGameData.game!.grid = null as any;
            service.checkAvailableActions(mockGameData);

            expect(service.getClientPlayerPosition).toHaveBeenCalledWith(mockGameData);
            expect(service.endTurn).not.toHaveBeenCalled();
        });
        it('should return early if gameData.game.grid is undefined', () => {
            mockGameData.game!.grid = undefined as any;

            service.checkAvailableActions(mockGameData);

            expect(service.getClientPlayerPosition).toHaveBeenCalledWith(mockGameData);
            expect(service.endTurn).not.toHaveBeenCalled();
        });
    });
});
