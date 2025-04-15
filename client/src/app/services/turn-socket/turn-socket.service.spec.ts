/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { DEFAULT_ACTION_POINTS, MOCK_PLAYER } from '@app/constants/global.constants';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { TurnSocketService } from './turn-socket.service';

const TURN_DATA = {
    player: MOCK_PLAYER,
    turnDuration: 60,
};

const TRANSITION_DATA = {
    nextPlayer: MOCK_PLAYER,
    transitionDuration: 5,
};

describe('TurnSocketService', () => {
    let service: TurnSocketService;
    let gameStateServiceSpy: jasmine.SpyObj<GameStateSocketService>;
    let gameplayServiceSpy: jasmine.SpyObj<GameplayService>;
    let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;

    const socketEvents: { [event: string]: (...args: unknown[]) => void } = {};

    beforeEach(() => {
        const gameStateSpy = jasmine.createSpyObj('GameStateSocketService', ['updateGameData'], {
            gameDataSubjectValue: {
                currentPlayer: { ...MOCK_PLAYER, name: 'initialPlayer' },
                clientPlayer: { ...MOCK_PLAYER, name: 'clientPlayer' },
                isCurrentlyMoving: false,
                isActionMode: false,
                isInCombatMode: false,
                turnTimer: 0,
                hasTurnEnded: false,
            },
        });

        const gameplaySpy = jasmine.createSpyObj('GameplayService', ['updateAvailablePath', 'closePopUp']);
        const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showMessage', 'showMultipleMessages']);
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['on']);

        socketSpy.on.and.callFake((event: string, callback: (...args: unknown[]) => void) => {
            socketEvents[event] = callback;
        });

        TestBed.configureTestingModule({
            providers: [
                TurnSocketService,
                { provide: GameStateSocketService, useValue: gameStateSpy },
                { provide: GameplayService, useValue: gameplaySpy },
                { provide: SnackbarService, useValue: snackbarSpy },
                { provide: SocketClientService, useValue: socketSpy },
            ],
        });

        service = TestBed.inject(TurnSocketService);
        gameStateServiceSpy = TestBed.inject(GameStateSocketService) as jasmine.SpyObj<GameStateSocketService>;
        gameplayServiceSpy = TestBed.inject(GameplayService) as jasmine.SpyObj<GameplayService>;
        snackbarServiceSpy = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
        socketClientServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;

        service.initializeTurnListeners();
    });

    it('should initialize turn listeners', () => {
        expect(socketClientServiceSpy.on).toHaveBeenCalledWith('turnStarted', jasmine.any(Function));
        expect(socketClientServiceSpy.on).toHaveBeenCalledWith('timerUpdate', jasmine.any(Function));
        expect(socketClientServiceSpy.on).toHaveBeenCalledWith('transitionStarted', jasmine.any(Function));
        expect(socketClientServiceSpy.on).toHaveBeenCalledWith('gameTurnResumed', jasmine.any(Function));
    });

    it('should handle turnStarted event for the current player', () => {
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer.name = MOCK_PLAYER.name;

        socketEvents['turnStarted'](TURN_DATA);

        expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith(`C'est à ${MOCK_PLAYER.name} de jouer`);
        expect(gameStateServiceSpy.gameDataSubjectValue.currentPlayer).toEqual(MOCK_PLAYER);
        expect(gameStateServiceSpy.gameDataSubjectValue.isCurrentlyMoving).toBeFalse();
        expect(gameStateServiceSpy.gameDataSubjectValue.isActionMode).toBeFalse();
        expect(gameStateServiceSpy.gameDataSubjectValue.isInCombatMode).toBeFalse();
        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.actionPoints).toBe(DEFAULT_ACTION_POINTS);
        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.movementPoints).toBe(MOCK_PLAYER.speed);
        expect(gameStateServiceSpy.gameDataSubjectValue.turnTimer).toBe(60);
        expect(gameStateServiceSpy.gameDataSubjectValue.hasTurnEnded).toBeFalse();
        expect(gameplayServiceSpy.updateAvailablePath).toHaveBeenCalled();
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle turnStarted event for another player', () => {
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer.name = 'DifferentPlayer';

        socketEvents['turnStarted'](TURN_DATA);

        expect(gameStateServiceSpy.gameDataSubjectValue.hasTurnEnded).toBeTrue();
    });

    it('should handle timerUpdate event', () => {
        const timerData = { timeLeft: 30 };

        socketEvents['timerUpdate'](timerData);

        expect(gameStateServiceSpy.gameDataSubjectValue.turnTimer).toBe(30);
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle transitionStarted event for current player', () => {
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer.name = MOCK_PLAYER.name;

        socketEvents['transitionStarted'](TRANSITION_DATA);

        expect(snackbarServiceSpy.showMultipleMessages).toHaveBeenCalledWith(`Le tour à ${MOCK_PLAYER.name} commence dans 5 secondes`, 'Close', 3000);
        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer).toEqual(MOCK_PLAYER);
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });

    it('should handle transitionStarted event for another player', () => {
        gameStateServiceSpy.gameDataSubjectValue.clientPlayer.name = 'DifferentPlayer';

        socketEvents['transitionStarted'](TRANSITION_DATA);

        expect(snackbarServiceSpy.showMultipleMessages).toHaveBeenCalledWith(`Le tour à ${MOCK_PLAYER.name} commence dans 5 secondes`, 'Close', 3000);
        expect(gameStateServiceSpy.gameDataSubjectValue.clientPlayer.name).not.toBe(MOCK_PLAYER.name);
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });
    it('should handle gameTurnResumed event', () => {
        const resumeData = { player: MOCK_PLAYER };

        socketEvents['gameTurnResumed'](resumeData);

        expect(gameStateServiceSpy.gameDataSubjectValue.currentPlayer).toEqual(MOCK_PLAYER);
        expect(gameStateServiceSpy.updateGameData).toHaveBeenCalled();
    });
});
