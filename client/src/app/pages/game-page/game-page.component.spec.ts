// // to the private function
// /* eslint-disable @typescript-eslint/no-explicit-any */
// // to test if grid is in called function even if it may be null
// /* eslint-disable @typescript-eslint/no-non-null-assertion */
// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { Router } from '@angular/router';
// import { Routes } from '@app/enums/global.enums';
// import { Game } from '@app/interfaces/game';
// import { Lobby } from '@app/interfaces/lobby';
// import { Player } from '@app/interfaces/player';
// import { Tile } from '@app/interfaces/tile';
// import { GameSocketService } from '@app/services/game-socket/game-socket.service';
// import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
// import { SnackbarService } from '@app/services/snackbar/snackbar.service';
// import { SocketClientService } from '@app/services/socket/socket-client-service';
// import { GamePageComponent } from './game-page.component';

// const mockPlayer: Player = { name: 'player1', actionPoints: 3, movementPoints: 5, isAdmin: false } as Player;
// const mockLobby: Lobby = { accessCode: '1234' } as Lobby;
// const mockTile: Tile = { id: 'tile-0-0' } as Tile;
// const playerTile: Tile = { ...mockTile, player: mockPlayer };
// const mockGame: Game = { grid: [[mockTile]] } as Game;

// describe('GamePageComponent', () => {
//     let component: GamePageComponent;
//     let fixture: ComponentFixture<GamePageComponent>;
//     let socketSpy: jasmine.SpyObj<SocketClientService>;
//     let movementSpy: jasmine.SpyObj<PlayerMovementService>;
//     let routerSpy: jasmine.SpyObj<Router>;
//     let snackbarSpy: jasmine.SpyObj<SnackbarService>;
//     let gameSocketSpy: jasmine.SpyObj<GameSocketService>;

//     beforeEach(async () => {
//         socketSpy = jasmine.createSpyObj('SocketClientService', ['emit', 'sendPlayerMovementUpdate']);

//         movementSpy = jasmine.createSpyObj('PlayerMovementService', ['availablePath', 'quickestPath']);

//         routerSpy = jasmine.createSpyObj('Router', ['navigate']);
//         snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showMessage']);
//         gameSocketSpy = jasmine.createSpyObj('GameSocketService', ['initializeSocketListeners', 'unsubscribeSocketListeners']);

//         await TestBed.configureTestingModule({
//             imports: [GamePageComponent],
//             providers: [
//                 { provide: SocketClientService, useValue: socketSpy },
//                 { provide: PlayerMovementService, useValue: movementSpy },
//                 { provide: Router, useValue: routerSpy },
//                 { provide: SnackbarService, useValue: snackbarSpy },
//                 { provide: GameSocketService, useValue: gameSocketSpy },
//             ],
//         }).compileComponents();

//         fixture = TestBed.createComponent(GamePageComponent);
//         component = fixture.componentInstance;

//         component.clientPlayer = mockPlayer;
//         component.currentPlayer = { ...mockPlayer };
//         component.lobby = mockLobby;
//         component.game = mockGame;
//     });

//     afterEach(() => {
//         sessionStorage.clear();
//     });

//     it('should create', () => {
//         expect(component).toBeTruthy();
//     });

//     it('should initialize socket listeners on init', () => {
//         component.ngOnInit();
//         expect(gameSocketSpy.initializeSocketListeners).toHaveBeenCalledWith(component);
//     });

//     it('should handle door click with valid conditions', () => {
//         component.isInCombatMode = false;
//         component.isActionMode = true;
//         component.clientPlayer.actionPoints = 3;

//         const currentTile = { ...mockTile, player: mockPlayer };
//         spyOn(component, 'getClientPlayerPosition').and.returnValue(currentTile);

//         component.handleDoorClick(mockTile);

//         expect(socketSpy.emit).toHaveBeenCalledWith('doorUpdate', {
//             currentTile,
//             targetTile: mockTile,
//             accessCode: mockLobby.accessCode,
//         });
//     });

//     it('should not handle door click in combat mode', () => {
//         component.isInCombatMode = true;
//         component.handleDoorClick(mockTile);
//         expect(socketSpy.emit).not.toHaveBeenCalled();
//     });

//     it('should not handle door if currentTile undefined', () => {
//         component.isInCombatMode = false;
//         component.isActionMode = true;
//         component.clientPlayer.actionPoints = 3;
//         spyOn(component, 'getClientPlayerPosition').and.returnValue(undefined);

//         component.handleDoorClick(mockTile);

//         expect(socketSpy.emit).not.toHaveBeenCalled();
//     });

//     describe('handleAttackClick', () => {
//         it('should handle attack click on adjacent tile', () => {
//             component.isActionMode = true;
//             component.clientPlayer.actionPoints = 3;
//             const targetTile = { ...mockTile, player: { ...mockPlayer, name: 'player2' }, id: 't2' } as Tile;

//             const currentTile = { ...mockTile, player: mockPlayer };
//             spyOn(component, 'getClientPlayerPosition').and.returnValue(currentTile);
//             spyOn(component as any, 'findAndCheckAdjacentTiles').and.returnValue(true);

//             component.handleAttackClick(targetTile);

//             expect(socketSpy.emit).toHaveBeenCalledWith('startCombat', {
//                 attackerName: currentTile.player.name,
//                 defenderName: targetTile.player?.name,
//                 accessCode: mockLobby.accessCode,
//                 isDebugMode: component.isDebugMode,
//             });
//         });

//         it('should handle attack click on adjacent tile if tile does not have a player', () => {
//             component.handleAttackClick(mockTile);

//             expect(socketSpy.emit).not.toHaveBeenCalled();
//         });
//     });

//     describe('handleTileClick', () => {
//         it('should not handle tile click in action mode', () => {
//             component.isActionMode = true;
//             component.handleTileClick(mockTile);
//             expect(socketSpy.sendPlayerMovementUpdate).not.toHaveBeenCalled();
//         });

//         it('should not handle tile click while moving', () => {
//             component.isCurrentlyMoving = true;
//             component.handleTileClick(mockTile);
//             expect(socketSpy.sendPlayerMovementUpdate).not.toHaveBeenCalled();
//         });

//         it('should handle tile click with valid conditions', () => {
//             component.isActionMode = false;
//             component.isCurrentlyMoving = false;
//             const currentTile = { ...mockTile, player: mockPlayer };
//             spyOn(component, 'getClientPlayerPosition').and.returnValue(currentTile);
//             component.handleTileClick(mockTile);
//             expect(socketSpy.sendPlayerMovementUpdate).toHaveBeenCalledWith(currentTile, mockTile, mockLobby.accessCode, mockGame.grid!);
//         });

//         it('should not handle tile click if current position is invalid', () => {
//             component.isActionMode = false;
//             component.isCurrentlyMoving = false;
//             spyOn(component, 'getClientPlayerPosition').and.returnValue(undefined);
//             component.handleTileClick(mockTile);
//             expect(socketSpy.sendPlayerMovementUpdate).not.toHaveBeenCalled();
//         });
//     });

//     describe('handleTeleport', () => {
//         it('should not handle teleport in combat mode', () => {
//             component.isInCombatMode = true;
//             component.handleTeleport(mockTile);
//             expect(socketSpy.emit).not.toHaveBeenCalled();
//         });

//         it("should handle teleport if it is the player's turn", () => {
//             component.isInCombatMode = false;
//             component.clientPlayer.name = 'test';
//             component.currentPlayer.name = 'test';
//             component.handleTeleport(mockTile);

//             expect(socketSpy.emit).toHaveBeenCalledWith('teleportPlayer', {
//                 accessCode: mockLobby.accessCode,
//                 player: mockPlayer,
//                 targetTile: mockTile,
//             });
//         });

//         it("should not handle teleport if it is not the player's turn", () => {
//             component.isInCombatMode = false;
//             component.clientPlayer.name = 'test';
//             component.currentPlayer.name = 'otherPlayer';
//             component.handleTeleport(mockTile);
//             expect(socketSpy.emit).not.toHaveBeenCalled();
//         });
//     });

//     describe('updateQuickestPath', () => {
//         it('should update quickest path correctly', () => {
//             spyOn(component as any, 'isAvailablePath').and.returnValue(true);
//             movementSpy.quickestPath.and.returnValue([mockTile]);
//             component.updateQuickestPath(mockTile);
//             expect(component.quickestPath).toEqual([mockTile]);
//         });

//         it('should not update quickest path if isAvailablePath is false', () => {
//             spyOn(component as any, 'isAvailablePath').and.returnValue(false);
//             component.updateQuickestPath(mockTile);
//             expect(component.quickestPath).toEqual(undefined);
//         });

//         it('should update quickest path to empty array if updateQuickestPath returns undefined', () => {
//             spyOn(component as any, 'isAvailablePath').and.returnValue(true);
//             movementSpy.quickestPath.and.returnValue(undefined);
//             component.updateQuickestPath(mockTile);
//             expect(component.quickestPath).toEqual([]);
//         });
//     });

//     it('should navigate to home page', () => {
//         component.backToHome();

//         expect(routerSpy.navigate).toHaveBeenCalledWith([Routes.HomePage]);
//     });

//     it('should toggle isActionMode and show snackbar message', () => {
//         component.isActionMode = false;
//         component.executeNextAction();
//         expect(component.isActionMode).toBeTrue();
//         expect(snackbarSpy.showMessage).toHaveBeenCalledWith('Mode action activé');

//         component.executeNextAction();
//         expect(component.isActionMode).toBeFalse();
//         expect(snackbarSpy.showMessage).toHaveBeenCalledTimes(2);
//     });

//     it('should abandon game', () => {
//         component.abandonGame();
//         expect(component.clientPlayer.hasAbandoned).toBeTrue();
//         expect(socketSpy.emit).toHaveBeenCalledWith('abandonedGame', {
//             player: mockPlayer,
//             accessCode: mockLobby.accessCode,
//         });
//         expect(routerSpy.navigate).toHaveBeenCalled();
//     });

//     it('should call attack on socketClientService with correct parameters', () => {
//         component.clientPlayer = mockPlayer;
//         component.lobby = mockLobby;

//         component.attack();

//         expect(socketSpy.emit).toHaveBeenCalledWith('performAttack', {
//             accessCode: mockLobby.accessCode,
//             attackerName: mockPlayer.name,
//         });
//     });

//     it('should emit evade event with correct parameters', () => {
//         component.clientPlayer = mockPlayer;
//         component.lobby = mockLobby;

//         component.evade();

//         expect(socketSpy.emit).toHaveBeenCalledWith('evade', {
//             accessCode: mockLobby.accessCode,
//             player: mockPlayer,
//         });
//     });

//     describe('getClientPlayerPosition', () => {
//         it('should return undefined if currentPlayer undefined', () => {
//             component.clientPlayer = undefined as unknown as Player;

//             expect(component.getClientPlayerPosition()).toBe(undefined);
//         });

//         it('should return the tile where the client player is located', () => {
//             component.game = {
//                 id: 'game1',
//                 grid: [[playerTile]],
//             } as Game;

//             component.clientPlayer = mockPlayer;

//             const result = component.getClientPlayerPosition();

//             expect(result).toEqual(playerTile);
//         });
//     });

//     describe('updateAvailablePath', () => {
//         it('should set availablePath using service when current player is client and game exists', () => {
//             component.game = { grid: [[playerTile]] } as Game;
//             spyOn(component, 'getClientPlayerPosition').and.returnValue(playerTile);
//             movementSpy.availablePath.and.returnValue([playerTile]);

//             component.updateAvailablePath();

//             expect(movementSpy.availablePath).toHaveBeenCalledWith(playerTile, mockPlayer.movementPoints, component.game.grid!);
//             expect(component.availablePath).toEqual([playerTile]);
//         });

//         it('should set availablePath to empty when current player is not client', () => {
//             component.currentPlayer.name = 'otherPlayer';
//             component.updateAvailablePath();
//             expect(component.availablePath).toEqual([]);
//         });

//         it('should set availablePath to empty when game is null', () => {
//             component.game = null;
//             component.updateAvailablePath();
//             expect(component.availablePath).toEqual([]);
//         });
//     });

//     describe('handlePageRefresh', () => {
//         it('should call abandonGame if refreshed is true', () => {
//             sessionStorage.setItem('refreshed', 'true');
//             const abandonSpy = spyOn(component, 'abandonGame');
//             component.handlePageRefresh();
//             expect(abandonSpy).toHaveBeenCalled();
//         });

//         it('should set refreshed to true if not already set', () => {
//             sessionStorage.setItem('refreshed', 'false');
//             component.handlePageRefresh();
//             expect(sessionStorage.getItem('refreshed')).toBe('true');
//         });
//     });

//     describe('updateAttackResult', () => {
//         it('should update attackResult with provided data', () => {
//             const mockData = { success: true, attackScore: 10, defenseScore: 5 };
//             component.updateAttackResult(mockData);
//             expect(component.attackResult).toEqual(mockData);
//         });

//         it('should set attackResult to null when data is null', () => {
//             component.updateAttackResult(null);
//             expect(component.attackResult).toBeNull();
//         });
//     });

//     describe('findAndCheckAdjacentTiles', () => {
//         it('should return true for horizontally adjacent tiles', () => {
//             const grid = [[{ id: 'tile-0-0' }, { id: 'tile-0-1' }]] as Tile[][];
//             expect(component['findAndCheckAdjacentTiles']('tile-0-0', 'tile-0-1', grid)).toBeTrue();
//         });

//         it('should return true for vertically adjacent tiles', () => {
//             const grid = [[{ id: 'tile-0-0' }], [{ id: 'tile-1-0' }]] as Tile[][];
//             expect(component['findAndCheckAdjacentTiles']('tile-0-0', 'tile-1-0', grid)).toBeTrue();
//         });

//         it('should return false for diagonal tiles', () => {
//             const grid = [
//                 [{ id: 'tile-0-0' }, { id: 'tile-0-1' }],
//                 [{ id: 'tile-1-0' }, { id: 'tile-1-1' }],
//             ] as Tile[][];
//             expect(component['findAndCheckAdjacentTiles']('tile-0-0', 'tile-1-1', grid)).toBeFalse();
//         });

//         it('should return false if tiles are not found', () => {
//             const grid = [[{ id: 'tile-0-0' }]] as Tile[][];
//             expect(component['findAndCheckAdjacentTiles']('tile-0-0', 'invalid', grid)).toBeFalse();
//         });
//     });

//     describe('isAvailablePath', () => {
//         it('should return true if tile is in availablePath', () => {
//             component.availablePath = [{ id: 'tile-0-0' } as Tile];
//             expect(component['isAvailablePath']({ id: 'tile-0-0' } as Tile)).toBeTrue();
//         });

//         it('should return false if tile is not in availablePath', () => {
//             component.availablePath = [{ id: 'tile-0-1' } as Tile];
//             expect(component['isAvailablePath']({ id: 'tile-0-0' } as Tile)).toBeFalse();
//         });

//         it('should return false if availablePath is undefined', () => {
//             component.availablePath = undefined;
//             expect(component['isAvailablePath']({ id: 'tile-0-0' } as Tile)).toBeFalse();
//         });
//     });

//     describe('handleKeyPress', () => {
//         it('should emit adminModeUpdate when "d" is pressed and client is admin', () => {
//             component.clientPlayer.isAdmin = true;
//             component['handleKeyPress'](new KeyboardEvent('keydown', { key: 'd' }));
//             expect(socketSpy.emit).toHaveBeenCalledWith('adminModeUpdate', { accessCode: mockLobby.accessCode });
//         });

//         it('should not emit when "d" is pressed and client is not admin', () => {
//             component.clientPlayer.isAdmin = false;
//             component['handleKeyPress'](new KeyboardEvent('keydown', { key: 'd' }));
//             expect(socketSpy.emit).not.toHaveBeenCalled();
//         });

//         it('should ignore other keys', () => {
//             component.clientPlayer.isAdmin = true;
//             component['handleKeyPress'](new KeyboardEvent('keydown', { key: 'a' }));
//             expect(socketSpy.emit).not.toHaveBeenCalled();
//         });
//     });
// });
