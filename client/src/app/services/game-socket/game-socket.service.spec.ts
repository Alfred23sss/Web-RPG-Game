/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Item } from '@app/classes/item/item';
import { DELAY_BEFORE_ENDING_GAME, DELAY_BEFORE_HOME, MOCK_GAME, MOCK_GRID, MOCK_PLAYER, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { DiceType, ItemName, TeamType, TileType } from '@common/enums';
import { ItemName, TileType } from '@common/enums';
import { GameSocketService } from './game-socket.service';

describe('GameSocketService', () => {
    let service: GameSocketService;
    let gameStateServiceSpy: jasmine.SpyObj<GameStateSocketService>;
    let gameplayServiceSpy: jasmine.SpyObj<GameplayService>;
    let clientNotifierSpy: jasmine.SpyObj<ClientNotifierServices>;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;

    const socketEvents: { [event: string]: any } = {};

    beforeEach(() => {
        const gameStateSpy = jasmine.createSpyObj('GameStateSocketService', ['updateGameData'], {
            gameDataSubjectValue: {
                lobby: { players: [] },
                game: { grid: MOCK_GRID },
                clientPlayer: { name: 'testPlayer', actionPoints: 3, movementPoints: 10 } as unknown as Player,
                currentPlayer: { name: 'testPlayer', actionPoints: 3, movementPoints: 10 } as unknown as Player,
                isDebugMode: true,
                movementPointsRemaining: 10,
            },
        });
        const gameplaySpy = jasmine.createSpyObj('GameplayService', [
            'abandonGame',
            'backToHome',
            'updateAvailablePath',
            'checkAvailableActions',
            'getClientPlayerPosition',
            'createItemPopUp',
            'navigateToFinalPage',
        ]);
        clientNotifierSpy = jasmine.createSpyObj('ClientNotifierServices', ['displayMessage', 'addLogbookEntry']);
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['on', 'emit']);
        socketSpy.socket = {
            on: (event: string, callback: any): void => {
                socketEvents[event] = callback;
            },
        };
        socketSpy.on.and.callFake((event: string, callback: any) => {
            socketSpy.socket.on(event, callback);
        });
        const playerMoveSpy = jasmine.createSpyObj('PlayerMovementService', ['calculateRemainingMovementPoints']);

        TestBed.configureTestingModule({
            providers: [
                GameSocketService,
                { provide: GameStateSocketService, useValue: gameStateSpy },
                { provide: GameplayService, useValue: gameplaySpy },
                { provide: ClientNotifierServices, useValue: clientNotifierSpy },
                { provide: SocketClientService, useValue: socketSpy },
                { provide: PlayerMovementService, useValue: playerMoveSpy },
            ],
        });

        service = TestBed.inject(GameSocketService);
        gameStateServiceSpy = TestBed.inject(GameStateSocketService) as jasmine.SpyObj<GameStateSocketService>;
        gameplayServiceSpy = TestBed.inject(GameplayService) as jasmine.SpyObj<GameplayService>;
        socketClientServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;

        service.initializeSocketListeners();

        sessionStorage.clear();
        sessionStorage.setItem('refreshed', 'true');
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('should initialize and set refreshed flag in session storage on first load', () => {
        expect(sessionStorage.getItem('refreshed')).toBe('true');
    });

    it('should handle game-abandoned event', () => {
        gameStateServiceSpy.gameDataSubjectValue.lobby.players = [MOCK_PLAYER];

        const data = { player: MOCK_PLAYER };

        socketEvents['game-abandoned'](data);

        expect(MOCK_PLAYER.hasAbandoned).toBeTrue();
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle gameDeleted event', fakeAsync(() => {
        socketEvents['gameDeleted']();
        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith(
            "Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil",
        );
        tick(DELAY_BEFORE_HOME);
        expect(gameplayServiceSpy.backToHome).toHaveBeenCalled();
    }));

    it('should handle gameEnded event', fakeAsync(() => {
        const data = { winner: ['WinnerPlayer'] };
        socketEvents['gameEnded'](data);
        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith(
            `👑 ${data.winner} a remporté la partie ! Redirection vers la page de fin sous peu`,
        );
        tick(DELAY_BEFORE_ENDING_GAME);
        expect(gameplayServiceSpy.navigateToFinalPage).toHaveBeenCalled();
    }));

    it('should handle gameEnded event with multiple winnners', fakeAsync(() => {
        const data = { winner: ['WinnerPlayer1', 'WinnerPlayer2'] };
        socketEvents['gameEnded'](data);
        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith(
            `👑 ${data.winner.join(', ')} ont remporté la partie ! Redirection vers la page de fin sous peu`,
        );
        tick(DELAY_BEFORE_ENDING_GAME);
        expect(gameplayServiceSpy.navigateToFinalPage).toHaveBeenCalled();
    }));

    it('should handle adminModeDisabled event', () => {
        gameStateServiceSpy.gameDataSubjectValue.isDebugMode = true;
        socketEvents['adminModeDisabled']();
        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith("Mode debug 'désactivé'");
        expect(gameStateServiceSpy.gameDataSubjectValue.isDebugMode).toBeFalse();
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle gameStarted event', () => {
        const data = {
            orderedPlayers: [MOCK_PLAYER, { ...MOCK_PLAYER, name: 'Player2' }],
            updatedGame: {
                ...MOCK_GAME,
                grid: MOCK_GRID,
            },
        };

        const callback = socketEvents['gameStarted'];

        callback(data);

        expect(gameStateServiceSpy.gameDataSubjectValue.lobby.players).toEqual(data.orderedPlayers);
        expect(gameStateServiceSpy.gameDataSubjectValue.game).toEqual(data.updatedGame);
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle playerListUpdate event', () => {
        const players = [MOCK_PLAYER, MOCK_PLAYER];
        socketEvents['playerListUpdate']({ players });
        expect(gameStateServiceSpy.gameDataSubjectValue.lobby.players).toEqual(players);
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle doorClicked event', () => {
        gameStateServiceSpy.gameDataSubjectValue.game = MOCK_GAME;
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints = 3;
        socketEvents['doorClicked']({ grid: MOCK_GRID });
        expect(gameStateServiceSpy.gameDataSubjectValue.game.grid).toEqual(MOCK_GRID);
        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints).toEqual(NO_ACTION_POINTS);
        expect(gameStateServiceSpy.gameDataSubjectValue.isActionMode).toBeFalse();
        expect(gameplayServiceSpy.updateAvailablePath).toHaveBeenCalled();
        expect(gameplayServiceSpy.checkAvailableActions).toHaveBeenCalled();
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle gridUpdate event', () => {
        gameStateServiceSpy.gameDataSubjectValue.game = MOCK_GAME;
        const newGrid = MOCK_GRID;
        socketEvents['gridUpdate']({ grid: newGrid });
        expect(gameStateServiceSpy.gameDataSubjectValue.game.grid).toEqual(newGrid);
        expect(gameplayServiceSpy.updateAvailablePath).toHaveBeenCalled();
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should not update grid when game data is missing in onGridUpdate', () => {
        gameStateServiceSpy.gameDataSubjectValue.game = undefined as unknown as Game;
        const initialGrid = gameStateServiceSpy.gameDataSubjectValue.game?.grid;
        const testGrid = MOCK_GRID;
        socketEvents['gridUpdate']({ grid: testGrid });
        expect(gameStateServiceSpy.gameDataSubjectValue.game?.grid).toEqual(initialGrid);
        expect(gameplayServiceSpy.updateAvailablePath).not.toHaveBeenCalled();
        expect(gameStateServiceSpy.updateGameData).not.toHaveBeenCalled();
    });

    it('should not process door click when grid is missing in onDoorClicked', () => {
        /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */ // necessary for the test
        gameStateServiceSpy.gameDataSubjectValue.game = { ...MOCK_GAME, grid: undefined! };
        const initialActionPoints = gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints;
        socketEvents['doorClicked']({ grid: MOCK_GRID });
        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints).toEqual(initialActionPoints);
        expect(gameplayServiceSpy.updateAvailablePath).not.toHaveBeenCalled();
        expect(gameStateServiceSpy.updateGameData).not.toHaveBeenCalled();
    });

    it('should abandon game when refresh flag exists in handlePageRefresh', () => {
        sessionStorage.setItem('refreshed', 'true');
        service['handlePageRefresh']();
        expect(gameplayServiceSpy.abandonGame).toHaveBeenCalledWith(gameStateServiceSpy.gameDataSubjectValue);
        expect(sessionStorage.getItem('refreshed')).toBe('true');
    });

    it('should handle missing player in onGameAbandoned', () => {
        gameStateServiceSpy.gameDataSubjectValue.lobby.players = [];
        const initialPlayerCount = gameStateServiceSpy.gameDataSubjectValue.lobby.players.length;
        const testPlayer = { ...MOCK_PLAYER, name: 'non-existent-player' };

        socketEvents['game-abandoned']({ player: testPlayer });

        expect(gameStateServiceSpy.gameDataSubjectValue.lobby.players.length).toEqual(initialPlayerCount);
        expect(gameStateServiceSpy.updateGameData).not.toHaveBeenCalled();
    });

    it('should handle adminModeChangedServerSide event and update debug mode', () => {
        gameStateServiceSpy.gameDataSubjectValue.isDebugMode = true;
        gameStateServiceSpy.gameDataSubjectValue.lobby.players = [{ ...MOCK_PLAYER, isAdmin: true }];

        socketEvents['adminModeChangedServerSide']();

        expect(gameStateServiceSpy.gameDataSubjectValue.isDebugMode).toBeFalse();
        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith('Mode debug désactivé');
        expect(clientNotifierSpy.addLogbookEntry).toHaveBeenCalledWith('Mode debug désactivé', [
            gameStateServiceSpy.gameDataSubjectValue.lobby.players[0],
        ]);
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should call gameplayService when itemChoice', () => {
        const mockItem = { name: ItemName.Default } as Item;

        const data = { items: [mockItem, mockItem, mockItem] as [Item, Item, Item] };
        socketEvents['itemChoice'](data);
        expect(gameplayServiceSpy.createItemPopUp).toHaveBeenCalledWith(data.items, gameStateServiceSpy.gameDataSubjectValue);
    });

    it('should emit itemDrop event with received data when itemDropped is triggered', () => {
        const mockData = {
            accessCode: 'ABCD',
            player: MOCK_PLAYER,
            item: new Item({
                id: '1',
                name: ItemName.Flag,
                imageSrc: 'flag.png',
                itemCounter: 1,
                description: 'Test flag',
            }),
        };

        socketEvents['itemDropped'](mockData);

        expect(socketClientServiceSpy.emit).toHaveBeenCalledWith('itemDrop', mockData);
    });

    describe('onWallClicked', () => {
        it('should update grid and client state when game data is valid', () => {
            const mockGrid = [[{ id: 'tile1', type: TileType.Wall } as Tile]];
            gameStateServiceSpy.gameDataSubjectValue.game = { grid: MOCK_GRID } as Game;
            gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints = 3;
            gameStateServiceSpy.gameDataSubjectValue.isActionMode = true;

            socketEvents['wallClicked']({ grid: mockGrid });

            expect(gameStateServiceSpy.gameDataSubjectValue.game.grid).toEqual(mockGrid);
            expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints).toBe(NO_ACTION_POINTS);
            expect(gameStateServiceSpy.gameDataSubjectValue.isActionMode).toBeFalse();
            expect(gameplayServiceSpy.updateAvailablePath).toHaveBeenCalledWith(gameStateServiceSpy.gameDataSubjectValue);
            expect(gameplayServiceSpy.checkAvailableActions).toHaveBeenCalledWith(gameStateServiceSpy.gameDataSubjectValue);
            expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
            expect(clientNotifierSpy.addLogbookEntry).toHaveBeenCalledWith('Un joueur a effectue une action sur un mur!', [
                gameStateServiceSpy.gameDataSubjectValue.clientPlayer,
            ]);
        });

        it('should do nothing when grid is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            gameStateServiceSpy.gameDataSubjectValue.game = { ...MOCK_GAME, grid: undefined! };
            const initialActionPoints = gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints;

            socketEvents['wallClicked']({ grid: MOCK_GRID });

            expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints).toBe(initialActionPoints);
            expect(gameplayServiceSpy.updateAvailablePath).not.toHaveBeenCalled();
        });
    });

    describe('onPlayerClientUpdate', () => {
        let mockPlayer: Player;

        let mockItem: Item;

        beforeEach(() => {
            mockItem = new Item({
                id: 'item1',
                imageSrc: 'sword.png',
                imageSrcGrey: 'sword-grey.png',
                name: 'sword',
                itemCounter: 1,
                description: 'A sharp sword',
            });

            mockPlayer = {
                name: 'testPlayer',
                avatar: 'avatar1.png',
                speed: 2,
                attack: { value: 10, bonusDice: DiceType.D6 },
                defense: { value: 5, bonusDice: DiceType.D6 },
                hp: { current: 100, max: 100 },
                movementPoints: 10,
                actionPoints: 3,
                inventory: [null, null],
                isAdmin: false,
                isVirtual: false,
                hasAbandoned: false,
                isActive: true,
                combatWon: 0,
                team: TeamType.RED,
            };
        });

        it('should update player in lobby when found', () => {
            gameStateServiceSpy.gameDataSubjectValue.lobby.players = [mockPlayer];
            const updatedPlayer = {
                ...mockPlayer,
                inventory: [mockItem, null],
            };
            socketEvents['playerClientUpdate']({ player: updatedPlayer });
            const lobbyPlayer = gameStateServiceSpy.gameDataSubjectValue.lobby.players[0];
            expect(lobbyPlayer.inventory).toEqual([mockItem, null]);
        });
    });

    it('should log when player picks up flag', () => {
        const flagItem = new Item({
            name: 'flag',
            imageSrc: 'flag.png',
            imageSrcGrey: 'flag-grey.png',
            description: 'Drapeau du jeu',
        });

        const initialPlayer: Player = {
            ...MOCK_PLAYER,
            inventory: [null, null] as [Item | null, Item | null],
        };

        gameStateServiceSpy.gameDataSubjectValue.lobby.players = [initialPlayer];
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer = { ...initialPlayer };

        const updatedPlayer: Player = {
            ...initialPlayer,
            inventory: [flagItem, null] as [Item | null, Item | null],
        };
        socketEvents['playerClientUpdate']({ player: updatedPlayer });
        expect(clientNotifierSpy.addLogbookEntry).toHaveBeenCalledWith(`${updatedPlayer.name} a pris le drapeau!`, [updatedPlayer]);

        const lobbyPlayer = gameStateServiceSpy.gameDataSubjectValue.lobby.players[0];
        expect(lobbyPlayer.inventory?.[0]?.name).toBe('flag');

        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.inventory?.[0]?.name).toBe('flag');

        const clonedItem = lobbyPlayer.inventory?.[0]?.clone();
        expect(clonedItem?.name).toBe('flag');
        expect(clonedItem?.id).not.toBe(flagItem.id);
    });

    describe('onPlayerUpdate', () => {
        let mockClientPlayer: Player;
        let mockOtherPlayer: Player;
        let mockPlayerInFight: Player;
        let mockItem: Item;
        let currentGameState: any;

        beforeEach(() => {
            mockItem = new Item({
                name: 'sword',
                imageSrc: 'sword.png',
                imageSrcGrey: 'sword-grey.png',
                description: 'Une épée tranchante',
            });
            mockClientPlayer = {
                name: 'clientPlayer',
                avatar: 'avatar1.png',
                speed: 2,
                attack: { value: 5, bonusDice: DiceType.D6 },
                defense: { value: 3, bonusDice: DiceType.D6 },
                hp: { current: 100, max: 100 },
                movementPoints: 10,
                actionPoints: 3,
                inventory: [null, null],
                isAdmin: false,
                isVirtual: false,
                hasAbandoned: false,
                isActive: true,
                combatWon: 0,
                team: TeamType.RED,
            };

            mockOtherPlayer = { ...mockClientPlayer, name: 'otherPlayer' };
            mockPlayerInFight = { ...mockClientPlayer, name: 'playerInFight' };
            currentGameState = {
                clientPlayer: { ...mockClientPlayer },
                playersInFight: [{ ...mockPlayerInFight }],
                lobby: { players: [mockClientPlayer, mockOtherPlayer, mockPlayerInFight] },
                currentPlayer: { ...mockClientPlayer },
            };
            Object.defineProperty(gameStateServiceSpy, 'gameDataSubjectValue', {
                get: () => currentGameState,
                configurable: true,
            });
            gameStateServiceSpy.updateGameData.and.callFake((newState) => {
                currentGameState = { ...currentGameState, ...newState };
            });
        });

        it('should update client player correctly', () => {
            const updatedPlayer: Player = {
                ...mockClientPlayer,
                hp: { current: 90, max: 100 },
                inventory: [mockItem, null],
            };
            socketEvents['playerUpdate']({ player: updatedPlayer });

            expect(currentGameState.clientPlayer.hp.current).toBe(90);
            expect(currentGameState.clientPlayer.inventory[0]?.name).toBe('sword');
            expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
        });

        it('should update correct player in fight list when index is found', () => {
            const secondPlayerInFight: Player = {
                ...mockPlayerInFight,
                name: 'secondPlayerInFight',
                hp: { current: 75, max: 100 },
            };
            currentGameState.playersInFight.push(secondPlayerInFight);

            const updatedPlayer: Player = {
                ...mockPlayerInFight,
                hp: { current: 30, max: 100 },
                inventory: [mockItem, null],
            };
            socketEvents['playerUpdate']({ player: updatedPlayer });
            expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
        });
    });
});
