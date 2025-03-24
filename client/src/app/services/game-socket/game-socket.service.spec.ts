/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DELAY_BEFORE_ENDING_GAME, DELAY_BEFORE_HOME, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { DiceType, ImageType, TileType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { GameSocketService } from './game-socket.service';

const MOCK_PLAYER: Player = {
    name: '',
    avatar: '',
    speed: 0,
    attack: {
        value: 0,
        bonusDice: DiceType.D4,
    },
    defense: {
        value: 0,
        bonusDice: DiceType.D4,
    },
    hp: {
        current: 0,
        max: 0,
    },
    movementPoints: 0,
    actionPoints: 0,
    inventory: [null, null],
    isAdmin: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
};

const MOCK_GRID: Tile[][] = [
    [
        { id: 'tile-0-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
        { id: 'tile-0-1', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
    ],
    [
        { id: 'tile-1-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
        { id: 'tile-1-1', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
    ],
];

const MOCK_GAME: Game = {
    id: '',
    name: '',
    size: '',
    mode: '',
    lastModified: new Date(),
    isVisible: false,
    previewImage: '',
    description: '',
    grid: MOCK_GRID,
};

describe('GameSocketService', () => {
    let service: GameSocketService;
    let gameStateServiceSpy: jasmine.SpyObj<GameStateSocketService>;
    let gameplayServiceSpy: jasmine.SpyObj<GameplayService>;
    let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
    let playerMovementServiceSpy: jasmine.SpyObj<PlayerMovementService>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socketEvents: { [event: string]: any } = {};

    beforeEach(() => {
        const gameStateSpy = jasmine.createSpyObj('GameStateSocketService', ['updateGameData'], {
            gameDataSubjectValue: {
                lobby: { players: [] },
                game: { grid: [] },
                clientPlayer: { name: 'testPlayer', actionPoints: 3, movementPoints: 10 },
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
        ]);
        const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showMessage']);
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['on']);
        socketSpy.socket = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            on: (event: string, callback: any): void => {
                socketEvents[event] = callback;
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socketSpy.on.and.callFake((event: string, callback: any) => {
            socketSpy.socket.on(event, callback);
        });
        const playerMoveSpy = jasmine.createSpyObj('PlayerMovementService', ['calculateRemainingMovementPoints']);

        TestBed.configureTestingModule({
            providers: [
                GameSocketService,
                { provide: GameStateSocketService, useValue: gameStateSpy },
                { provide: GameplayService, useValue: gameplaySpy },
                { provide: SnackbarService, useValue: snackbarSpy },
                { provide: SocketClientService, useValue: socketSpy },
                { provide: PlayerMovementService, useValue: playerMoveSpy },
            ],
        });

        service = TestBed.inject(GameSocketService);
        gameStateServiceSpy = TestBed.inject(GameStateSocketService) as jasmine.SpyObj<GameStateSocketService>;
        gameplayServiceSpy = TestBed.inject(GameplayService) as jasmine.SpyObj<GameplayService>;
        snackbarServiceSpy = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
        playerMovementServiceSpy = TestBed.inject(PlayerMovementService) as jasmine.SpyObj<PlayerMovementService>;

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
        expect(gameStateServiceSpy.gameDataSubjectValue.lobby.players).not.toContain(MOCK_PLAYER);
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle gameDeleted event', fakeAsync(() => {
        socketEvents['gameDeleted']();
        expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith(
            "Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil",
        );
        tick(DELAY_BEFORE_HOME);
        expect(gameplayServiceSpy.backToHome).toHaveBeenCalled();
    }));

    it('should handle gameEnded event', fakeAsync(() => {
        const data = { winner: 'WinnerPlayer' };
        socketEvents['gameEnded'](data);
        expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith(`👑 ${data.winner} a remporté la partie ! Redirection vers l'accueil sous peu`);
        tick(DELAY_BEFORE_ENDING_GAME);
        expect(gameplayServiceSpy.abandonGame).toHaveBeenCalledWith(gameStateServiceSpy.gameDataSubjectValue);
    }));

    it('should handle adminModeDisabled event', () => {
        gameStateServiceSpy.gameDataSubjectValue.isDebugMode = true;
        socketEvents['adminModeDisabled']();
        expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith("Mode debug 'désactivé'");
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

    it('should handle playerMovement event', () => {
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer.name = 'testPlayer';
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer.movementPoints = 10;

        const mockPlayer: Player = { ...MOCK_PLAYER, name: 'testPlayer' };

        playerMovementServiceSpy.calculateRemainingMovementPoints.and.returnValue(3);

        const data = {
            grid: MOCK_GRID,
            player: mockPlayer,
            isCurrentlyMoving: true,
        };

        socketEvents['playerMovement'](data);

        expect(gameStateServiceSpy.gameDataSubjectValue.game.grid).toEqual(data.grid);
        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.movementPoints).toEqual(7);
        expect(gameStateServiceSpy.gameDataSubjectValue.movementPointsRemaining).toEqual(7);
        expect(gameStateServiceSpy.gameDataSubjectValue.isCurrentlyMoving).toBeTrue();
        expect(gameplayServiceSpy.updateAvailablePath).toHaveBeenCalled();
        expect(gameplayServiceSpy.checkAvailableActions).toHaveBeenCalled();
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle playerUpdate event', () => {
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer.name = MOCK_PLAYER.name;
        const updatedPlayer = { ...MOCK_PLAYER };
        socketEvents['playerUpdate']({ player: updatedPlayer });
        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer).toEqual(updatedPlayer);
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

    it('should handle adminModeChangedServerSide event', () => {
        gameStateServiceSpy.gameDataSubjectValue.isDebugMode = true;
        socketEvents['adminModeChangedServerSide']();
        expect(gameStateServiceSpy.gameDataSubjectValue.isDebugMode).toBeFalse();
        expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith('Mode debug désactivé');
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

    it('should show correct snackbar message when enabling admin mode in onAdminModeChangedServerSide', () => {
        gameStateServiceSpy.gameDataSubjectValue.isDebugMode = false;
        socketEvents['adminModeChangedServerSide']();
        expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith('Mode debug activé');
    });

    it('should handle missing player in onGameAbandoned', () => {
        gameStateServiceSpy.gameDataSubjectValue.lobby.players = [];
        const initialPlayerCount = gameStateServiceSpy.gameDataSubjectValue.lobby.players.length;
        const testPlayer = { ...MOCK_PLAYER, name: 'non-existent-player' };

        socketEvents['game-abandoned']({ player: testPlayer });

        expect(gameStateServiceSpy.gameDataSubjectValue.lobby.players.length).toEqual(initialPlayerCount);
        expect(gameStateServiceSpy.updateGameData).not.toHaveBeenCalled();
    });
});
