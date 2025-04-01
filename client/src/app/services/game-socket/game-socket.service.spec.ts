/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DELAY_BEFORE_ENDING_GAME, DELAY_BEFORE_HOME, MOCK_GAME, MOCK_GRID, MOCK_PLAYER, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { GameSocketService } from './game-socket.service';

describe('GameSocketService', () => {
    let service: GameSocketService;
    let gameStateServiceSpy: jasmine.SpyObj<GameStateSocketService>;
    let gameplayServiceSpy: jasmine.SpyObj<GameplayService>;
    let playerMovementServiceSpy: jasmine.SpyObj<PlayerMovementService>;
    let clientNotifierSpy: jasmine.SpyObj<ClientNotifierServices>;

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
        clientNotifierSpy = jasmine.createSpyObj('ClientNotifierServices', ['displayMessage', 'addLogbookEntry']);
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['on']);
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
        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith(
            "Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil",
        );
        tick(DELAY_BEFORE_HOME);
        expect(gameplayServiceSpy.backToHome).toHaveBeenCalled();
    }));

    it('should handle gameEnded event', fakeAsync(() => {
        const data = { winner: 'WinnerPlayer' };
        socketEvents['gameEnded'](data);
        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith(`👑 ${data.winner} a remporté la partie ! Redirection vers l'accueil sous peu`);
        tick(DELAY_BEFORE_ENDING_GAME);
        expect(gameplayServiceSpy.abandonGame).toHaveBeenCalledWith(gameStateServiceSpy.gameDataSubjectValue);
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
        gameStateServiceSpy.gameDataSubjectValue.lobby.players = [{ ...MOCK_PLAYER, isAdmin: true }];

        socketEvents['adminModeChangedServerSide']();

        expect(gameStateServiceSpy.gameDataSubjectValue.isDebugMode).toBeFalse();
        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith('Mode debug désactivé');
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
        gameStateServiceSpy.gameDataSubjectValue.lobby.players = [{ ...MOCK_PLAYER, isAdmin: true }];

        socketEvents['adminModeChangedServerSide']();

        expect(clientNotifierSpy.displayMessage).toHaveBeenCalledWith('Mode debug activé');
    });

    it('should not notify when no admin player exists', () => {
        gameStateServiceSpy.gameDataSubjectValue.lobby.players = [];
        gameStateServiceSpy.gameDataSubjectValue.isDebugMode = false;

        socketEvents['adminModeChangedServerSide']();

        expect(gameStateServiceSpy.gameDataSubjectValue.isDebugMode).toBeTrue();
        expect(clientNotifierSpy.displayMessage).not.toHaveBeenCalled();
        expect(clientNotifierSpy.addLogbookEntry).not.toHaveBeenCalled();
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
});
