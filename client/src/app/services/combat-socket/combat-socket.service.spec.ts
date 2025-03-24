/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { CombatSocketService } from './combat-socket.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { MatDialog } from '@angular/material/dialog';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { DEFAULT_ESCAPE_ATTEMPTS, DELAY_MESSAGE_AFTER_COMBAT_ENDED } from '@app/constants/global.constants';
import { GameCombatComponent } from '@app/components/game-combat/game-combat.component';
import { Player } from '@app/interfaces/player';
import { DiceType } from '@app/enums/global.enums';

const MOCK_PLAYER: Player = {
    name: 'NewPlayer',
    avatar: 'default-avatar.png',
    speed: 5,
    attack: { value: 10, bonusDice: DiceType.D6 },
    defense: { value: 8, bonusDice: DiceType.D4 },
    inventory: [null, null],
    actionPoints: 3,
    movementPoints: 5,
    hp: {
        current: 0,
        max: 0,
    },
    isAdmin: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
};

const EVENT_HANDLERS: { [key: string]: (data?: any) => void } = {};

describe('CombatSocketService', () => {
    let service: CombatSocketService;
    let socketClientServiceMock: jasmine.SpyObj<SocketClientService>;
    let gameStateServiceMock: jasmine.SpyObj<GameStateSocketService>;
    let snackbarServiceMock: jasmine.SpyObj<SnackbarService>;
    let dialogMock: jasmine.SpyObj<MatDialog>;
    let gameplayServiceMock: jasmine.SpyObj<GameplayService>;

    beforeEach(() => {
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['on']);
        const gameStateSpy = jasmine.createSpyObj('GameStateSocketService', ['updateGameData']);
        const snackbarSpy = jasmine.createSpyObj('SnackbarService', ['showMultipleMessages']);
        const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        const gameplaySpy = jasmine.createSpyObj('GameplayService', ['updateAttackResult']);

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketSpy },
                { provide: GameStateSocketService, useValue: gameStateSpy },
                { provide: SnackbarService, useValue: snackbarSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: GameplayService, useValue: gameplaySpy },
            ],
        });

        service = TestBed.inject(CombatSocketService);
        socketClientServiceMock = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        gameStateServiceMock = TestBed.inject(GameStateSocketService) as jasmine.SpyObj<GameStateSocketService>;
        snackbarServiceMock = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;
        dialogMock = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
        gameplayServiceMock = TestBed.inject(GameplayService) as jasmine.SpyObj<GameplayService>;

        (gameStateServiceMock.gameDataSubjectValue as any) = {
            isInCombatMode: false,
            clientPlayer: { actionPoints: 0, name: 'TestPlayer', movementPoints: 0 },
            currentPlayer: { name: 'TestPlayer' },
            movementPointsRemaining: 5,
            evadeResult: null,
            attackResult: null,
            escapeAttempts: DEFAULT_ESCAPE_ATTEMPTS,
            isActionMode: false,
            turnTimer: 0,
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should handle combatStarted event', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        EVENT_HANDLERS['combatStarted']();

        expect(gameStateServiceMock.updateGameData).toHaveBeenCalledWith(jasmine.objectContaining({ isInCombatMode: true }));
        expect(dialogMock.open).toHaveBeenCalledWith(GameCombatComponent, {
            width: '800px',
            height: '500px',
            disableClose: true,
        });
    });

    it('should handle attackResult event', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = { success: true, attackScore: 10, defenseScore: 5 };
        EVENT_HANDLERS['attackResult'](testData);

        expect(gameplayServiceMock.updateAttackResult).toHaveBeenCalledWith(gameStateServiceMock.gameDataSubjectValue, testData);
        expect(gameStateServiceMock.gameDataSubjectValue.evadeResult).toBeNull();
        expect(gameStateServiceMock.updateGameData).toHaveBeenCalledWith(gameStateServiceMock.gameDataSubjectValue);
    });

    it('should handle combatTurnStarted event', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = {
            fighter: MOCK_PLAYER,
            duration: 30,
            escapeAttemptsLeft: 2,
        };

        EVENT_HANDLERS['combatTurnStarted'](testData);

        expect(gameStateServiceMock.gameDataSubjectValue.currentPlayer).toEqual(MOCK_PLAYER);
        expect(gameStateServiceMock.gameDataSubjectValue.currentPlayer).toEqual(
            jasmine.objectContaining({
                name: 'NewPlayer',
                actionPoints: 3,
            }),
        );

        expect(gameStateServiceMock.updateGameData).toHaveBeenCalledWith(gameStateServiceMock.gameDataSubjectValue);
    });

    it('should handle combatTimerUpdate event', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = { timeLeft: 15 };
        EVENT_HANDLERS['combatTimerUpdate'](testData);

        expect(gameStateServiceMock.gameDataSubjectValue.turnTimer).toBe(15);
        expect(gameStateServiceMock.updateGameData).toHaveBeenCalledWith(gameStateServiceMock.gameDataSubjectValue);
    });

    it('should handle escapeAttempt event', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = { attemptsLeft: 1, isEscapeSuccessful: true };
        EVENT_HANDLERS['escapeAttempt'](testData);

        expect(gameStateServiceMock.gameDataSubjectValue.evadeResult).toEqual(testData);
        expect(gameStateServiceMock.gameDataSubjectValue.attackResult).toBeNull();
        expect(gameStateServiceMock.gameDataSubjectValue.escapeAttempts).toBe(testData.attemptsLeft);
        expect(gameStateServiceMock.updateGameData).toHaveBeenCalledWith(gameStateServiceMock.gameDataSubjectValue);
    });

    it('should handle combatEnded when winner has not evaded', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = { winner: MOCK_PLAYER, hasEvaded: false };

        gameStateServiceMock.gameDataSubjectValue.clientPlayer.actionPoints = 5;
        gameStateServiceMock.gameDataSubjectValue.isInCombatMode = true;
        EVENT_HANDLERS['combatEnded'](testData);

        expect(snackbarServiceMock.showMultipleMessages).toHaveBeenCalledWith(
            'NewPlayer a gagné le combat !',
            undefined,
            DELAY_MESSAGE_AFTER_COMBAT_ENDED,
        );
    });

    it('should handle combatEnded when winner has evaded', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = { winner: MOCK_PLAYER, hasEvaded: true };
        EVENT_HANDLERS['combatEnded'](testData);

        expect(snackbarServiceMock.showMultipleMessages).toHaveBeenCalledWith(
            'NewPlayer a evadé le combat !',
            undefined,
            DELAY_MESSAGE_AFTER_COMBAT_ENDED,
        );
    });

    it('should not update movement points if client is not current player', () => {
        const eventHandlers: { [key: string]: (data?: any) => void } = {};
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            eventHandlers[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = { winner: { name: MOCK_PLAYER.name }, hasEvaded: false };
        gameStateServiceMock.gameDataSubjectValue.clientPlayer.name = 'ClientPlayer';
        gameStateServiceMock.gameDataSubjectValue.currentPlayer.name = 'OtherPlayer';
        gameStateServiceMock.gameDataSubjectValue.clientPlayer.movementPoints = 0;

        eventHandlers['combatEnded'](testData);

        expect(gameStateServiceMock.gameDataSubjectValue.clientPlayer.movementPoints).toBe(0);
    });
});
