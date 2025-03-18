import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { GamePageComponent } from './game-page.component';

const mockPlayer: Player = { name: 'player1', actionPoints: 3, movementPoints: 5, isAdmin: false } as Player;
const mockLobby: Lobby = { accessCode: '1234' } as Lobby;
const mockTile: Tile = { id: 'tile-0-0' } as Tile;
const mockGame: Game = { grid: [[mockTile]] } as Game;

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let socketSpy: jasmine.SpyObj<SocketClientService>;
    let movementSpy: jasmine.SpyObj<PlayerMovementService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let snackbarSpy: jasmine.SpyObj<SnackbarService>;
    let gameSocketSpy: jasmine.SpyObj<GameSocketService>;

    beforeEach(async () => {
        socketSpy = jasmine.createSpyObj('SocketClientService', [
            'sendDoorUpdate',
            'startCombat',
            'sendPlayerMovementUpdate',
            'sendTeleportPlayer',
            'endTurn',
            'attack',
            'emit',
            'sendAdminModeUpdate',
            'abandonGame',
        ]);

        movementSpy = jasmine.createSpyObj('PlayerMovementService', ['availablePath', 'quickestPath']);

        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showMessage']);
        gameSocketSpy = jasmine.createSpyObj('GameSocketService', ['initializeSocketListeners', 'unsubscribeSocketListeners']);

        await TestBed.configureTestingModule({
            imports: [GamePageComponent],
            providers: [
                { provide: SocketClientService, useValue: socketSpy },
                { provide: PlayerMovementService, useValue: movementSpy },
                { provide: Router, useValue: routerSpy },
                { provide: SnackbarService, useValue: snackbarSpy },
                { provide: GameSocketService, useValue: gameSocketSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;

        component.clientPlayer = mockPlayer;
        component.currentPlayer = { ...mockPlayer };
        component.lobby = mockLobby;
        component.game = mockGame;
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize socket listeners on init', () => {
        component.ngOnInit();
        expect(gameSocketSpy.initializeSocketListeners).toHaveBeenCalledWith(component);
    });

    it('should handle door click with valid conditions', () => {
        component.isInCombatMode = false;
        component.isActionMode = true;
        component.clientPlayer.actionPoints = 3;

        const currentTile = { ...mockTile, player: mockPlayer };
        spyOn(component, 'getClientPlayerPosition').and.returnValue(currentTile);

        component.handleDoorClick(mockTile);

        expect(socketSpy.sendDoorUpdate).toHaveBeenCalled();
    });

    it('should not handle door click in combat mode', () => {
        component.isInCombatMode = true;
        component.handleDoorClick(mockTile);
        expect(socketSpy.sendDoorUpdate).not.toHaveBeenCalled();
    });

    it('should not handle door if currentTile undefined', () => {
        component.isInCombatMode = false;
        component.isActionMode = true;
        component.clientPlayer.actionPoints = 3;
        spyOn(component, 'getClientPlayerPosition').and.returnValue(undefined);

        component.handleDoorClick(mockTile);

        expect(socketSpy.sendDoorUpdate).not.toHaveBeenCalled();
    });

    it('should handle attack click on adjacent tile', () => {
        component.isActionMode = true;
        component.clientPlayer.actionPoints = 3;
        const targetTile = { ...mockTile, player: { ...mockPlayer, name: 'player2' }, id: 't2' } as Tile;

        const currentTile = { ...mockTile, player: mockPlayer };
        spyOn(component, 'getClientPlayerPosition').and.returnValue(currentTile);
        spyOn(component as any, 'findAndCheckAdjacentTiles').and.returnValue(true);

        component.handleAttackClick(targetTile);

        expect(socketSpy.startCombat).toHaveBeenCalled();
    });

    describe('handleTileClick', () => {
        it('should not handle tile click in action mode', () => {
            component.isActionMode = true;
            component.handleTileClick(mockTile);
            expect(socketSpy.sendPlayerMovementUpdate).not.toHaveBeenCalled();
        });

        it('should not handle tile click while moving', () => {
            component.isCurrentlyMoving = true;
            component.handleTileClick(mockTile);
            expect(socketSpy.sendPlayerMovementUpdate).not.toHaveBeenCalled();
        });

        it('should handle tile click with valid conditions', () => {
            component.isActionMode = false;
            component.isCurrentlyMoving = false;
            const currentTile = { ...mockTile, player: mockPlayer };
            spyOn(component, 'getClientPlayerPosition').and.returnValue(currentTile);
            component.handleTileClick(mockTile);
            expect(socketSpy.sendPlayerMovementUpdate).toHaveBeenCalledWith(currentTile, mockTile, mockLobby.accessCode, mockGame.grid!);
        });

        it('should not handle tile click if current position is invalid', () => {
            component.isActionMode = false;
            component.isCurrentlyMoving = false;
            spyOn(component, 'getClientPlayerPosition').and.returnValue(undefined);
            component.handleTileClick(mockTile);
            expect(socketSpy.sendPlayerMovementUpdate).not.toHaveBeenCalled();
        });
    });

    describe('handleTeleport', () => {
        it('should not handle teleport in combat mode', () => {
            component.isInCombatMode = true;
            component.handleTeleport(mockTile);
            expect(socketSpy.sendTeleportPlayer).not.toHaveBeenCalled();
        });

        it("should handle teleport if it is the player's turn", () => {
            component.isInCombatMode = false;
            component.clientPlayer.name = 'test';
            component.currentPlayer.name = 'test';
            component.handleTeleport(mockTile);
            expect(socketSpy.sendTeleportPlayer).toHaveBeenCalledWith(mockLobby.accessCode, mockPlayer, mockTile);
        });

        it("should not handle teleport if it is not the player's turn", () => {
            component.isInCombatMode = false;
            component.clientPlayer.name = 'test';
            component.currentPlayer.name = 'otherPlayer';
            component.handleTeleport(mockTile);
            expect(socketSpy.sendTeleportPlayer).not.toHaveBeenCalled();
        });
    });

    describe('updateQuickestPath', () => {
        it('should update quickest path correctly', () => {
            spyOn(component as any, 'isAvailablePath').and.returnValue(true);
            movementSpy.quickestPath.and.returnValue([mockTile]);
            component.updateQuickestPath(mockTile);
            expect(component.quickestPath).toEqual([mockTile]);
        });

        it('should not update quickest path if isAvailablePath is false', () => {
            spyOn(component as any, 'isAvailablePath').and.returnValue(false);
            component.updateQuickestPath(mockTile);
            expect(component.quickestPath).toEqual(undefined);
        });
    });

    it('should navigate to home page', () => {
        component.backToHome();

        expect(routerSpy.navigate).toHaveBeenCalledWith([Routes.HomePage]);
    });

    it('should toggle isActionMode and show snackbar message', () => {
        component.isActionMode = false;
        component.executeNextAction();
        expect(component.isActionMode).toBeTrue();
        expect(snackbarSpy.showMessage).toHaveBeenCalledWith('Mode action activé');

        component.executeNextAction();
        expect(component.isActionMode).toBeFalse();
        expect(snackbarSpy.showMessage).toHaveBeenCalledTimes(2);
    });

    it('should abandon game', () => {
        component.abandonGame();
        expect(component.clientPlayer.hasAbandoned).toBeTrue();
        expect(socketSpy.abandonGame).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalled();
    });

    it('should call attack on socketClientService with correct parameters', () => {
        component.clientPlayer = mockPlayer;
        component.lobby = mockLobby;

        component.attack();

        expect(socketSpy.attack).toHaveBeenCalledWith(mockPlayer.name, mockLobby.accessCode);
    });

    it('should emit evade event with correct parameters', () => {
        component.clientPlayer = mockPlayer;
        component.lobby = mockLobby;

        component.evade();

        expect(socketSpy.emit).toHaveBeenCalledWith('evade', {
            accessCode: mockLobby.accessCode,
            player: mockPlayer,
        });
    });

    describe('getClientPlayerPosition', () => {
        it('should return undefined if currentPlayer undefined', () => {
            component.clientPlayer = undefined as unknown as Player;

            expect(component.getClientPlayerPosition()).toBe(undefined);
        });

        it('should return the tile where the client player is located', () => {
            const playerTile: Tile = { ...mockTile, player: mockPlayer };

            component.game = {
                id: 'game1',
                grid: [[playerTile]],
            } as Game;

            component.clientPlayer = mockPlayer;

            const result = component.getClientPlayerPosition();

            expect(result).toEqual(playerTile);
        });
    });
});

// it('should end turn correctly', () => {
//     component.endTurn();
//     expect(socketSpy.endTurn).toHaveBeenCalledWith(mockLobby.accessCode);
// });

// it('should toggle action mode', () => {
//     component.executeNextAction();
//     expect(component.isActionMode).toBeTrue();
//     expect(snackbarSpy.showMessage).toHaveBeenCalled();
// });

// it('should abandon game', () => {
//     component.abandonGame();
//     expect(component.clientPlayer.hasAbandoned).toBeTrue();
//     expect(socketSpy.abandonGame).toHaveBeenCalled();
//     expect(routerSpy.navigate).toHaveBeenCalled();
// });

// it('should get player position', () => {
//     const tile = component.getClientPlayerPosition();
//     expect(tile).toBeDefined();
// });

// it('should update attack result', () => {
//     const result = { success: true, attackScore: 15, defenseScore: 10 };
//     component.updateAttackResult(result);
//     expect(component.attackResult).toEqual(result);
// });

// it('should handle admin key press with cast', () => {
//     const event = new KeyboardEvent('keydown', { key: 'd' });
//     component.clientPlayer.isAdmin = true;

//     spyOn(component as any, 'handleKeyPress').and.callThrough();

//     document.dispatchEvent(event);

//     expect(socketSpy.sendAdminModeUpdate).toHaveBeenCalledWith(mockLobby.accessCode);
// });

// it('should clean up on destroy', () => {
//     spyOn(document, 'removeEventListener');
//     component.ngOnDestroy();
//     expect(document.removeEventListener).toHaveBeenCalled();
//     expect(gameSocketSpy.unsubscribeSocketListeners).toHaveBeenCalled();
// });

// // Tests supplémentaires pour couvrir les branches restantes
// it('should not attack same player', () => {
//     const targetTile = { ...mockTile, player: mockPlayer };
//     component.handleAttackClick(targetTile);
//     expect(socketSpy.startCombat).not.toHaveBeenCalled();
// });

// it('should not teleport in combat', () => {
//     component.isInCombatMode = true;
//     component.handleTeleport(mockTile);
//     expect(socketSpy.sendTeleportPlayer).not.toHaveBeenCalled();
// });

// it('should handle page refresh', () => {
//     component.handlePageRefresh();
//     expect(sessionStorage.getItem('refreshed')).toBe('true');
// });
