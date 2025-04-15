/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { GameCombatComponent } from '@app/components/game-combat/game-combat.component';
import { DEFAULT_ESCAPE_ATTEMPTS, DELAY_MESSAGE_AFTER_COMBAT_ENDED, MOCK_PLAYER } from '@app/constants/global.constants';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { CombatSocketService } from './combat-socket.service';

const EVENT_HANDLERS: { [key: string]: (data?: any) => void } = {};

describe('CombatSocketService', () => {
    let service: CombatSocketService;
    let socketClientServiceMock: jasmine.SpyObj<SocketClientService>;
    let gameStateServiceMock: jasmine.SpyObj<GameStateSocketService>;
    let clientNotifierMock: jasmine.SpyObj<ClientNotifierServices>;
    let dialogMock: jasmine.SpyObj<MatDialog>;

    beforeEach(() => {
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['on']);
        const clientNotifierSpy = jasmine.createSpyObj('ClientNotifierServices', ['showMultipleMessages', 'addLogbookEntry']);
        const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        const gameplaySpy = jasmine.createSpyObj('GameplayService', ['updateAttackResult']);
        const gameStateSpy = jasmine.createSpyObj('GameStateSocketService', ['updateGameData', 'updateClosePopup']);

        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketSpy },
                { provide: GameStateSocketService, useValue: gameStateSpy },
                { provide: ClientNotifierServices, useValue: clientNotifierSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: GameplayService, useValue: gameplaySpy },
            ],
        });

        service = TestBed.inject(CombatSocketService);
        socketClientServiceMock = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        gameStateServiceMock = TestBed.inject(GameStateSocketService) as jasmine.SpyObj<GameStateSocketService>;
        clientNotifierMock = TestBed.inject(ClientNotifierServices) as jasmine.SpyObj<ClientNotifierServices>;
        dialogMock = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

        (gameStateServiceMock.gameDataSubjectValue as any) = {
            isInCombatMode: false,
            clientPlayer: MOCK_PLAYER,
            currentPlayer: MOCK_PLAYER,
            movementPointsRemaining: 5,
            evadeResult: null,
            attackResult: null,
            escapeAttempts: DEFAULT_ESCAPE_ATTEMPTS,
            isActionMode: false,
            turnTimer: 0,
            lobby: {
                players: [
                    { ...MOCK_PLAYER, name: 'Attacker' },
                    { ...MOCK_PLAYER, name: 'Defender' },
                ],
            },
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

        const mockAttacker = { ...MOCK_PLAYER, name: 'Attacker' };
        const mockDefender = { ...MOCK_PLAYER, name: 'Defender' };

        EVENT_HANDLERS['combatStarted']({
            attacker: mockAttacker,
            defender: mockDefender,
        });

        expect(dialogMock.open).toHaveBeenCalledWith(
            GameCombatComponent,
            jasmine.objectContaining({
                data: jasmine.objectContaining({
                    attacker: mockAttacker,
                    defender: mockDefender,
                }),
            }),
        );
    });

    it('should handle attackResult event', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = { success: true, attackScore: 10, defenseScore: 5 };
        EVENT_HANDLERS['attackResult'](testData);

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
                name: MOCK_PLAYER.name,
                actionPoints: MOCK_PLAYER.actionPoints,
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

    it('should handle combatEnded when winner has not evaded', () => {
        socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
            EVENT_HANDLERS[event] = callback;
        });

        service.initializeCombatListeners();
        const testData = { winner: MOCK_PLAYER, hasEvaded: false };

        gameStateServiceMock.gameDataSubjectValue.clientPlayer.actionPoints = 5;
        gameStateServiceMock.gameDataSubjectValue.isInCombatMode = true;
        EVENT_HANDLERS['combatEnded'](testData);

        expect(clientNotifierMock.showMultipleMessages).toHaveBeenCalledWith(
            'testPlayer a gagné le combat !',
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

        expect(clientNotifierMock.showMultipleMessages).toHaveBeenCalledWith(
            'testPlayer a evadé le combat !',
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
        gameStateServiceMock.gameDataSubjectValue.clientPlayer.name = 'testPlayer';
        gameStateServiceMock.gameDataSubjectValue.currentPlayer.name = MOCK_PLAYER.name;
        gameStateServiceMock.gameDataSubjectValue.clientPlayer.movementPoints = MOCK_PLAYER.movementPoints;

        eventHandlers['combatEnded'](testData);

        expect(gameStateServiceMock.gameDataSubjectValue.clientPlayer.movementPoints).toBe(MOCK_PLAYER.movementPoints);
    });

    describe('onEscapeAttempt', () => {
        beforeEach(() => {
            socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
                EVENT_HANDLERS[event] = callback;
            });

            service.initializeCombatListeners();
        });

        it('should log a successful escape attempt when isEscapeSuccessful is true', () => {
            const testData = {
                attemptsLeft: 1,
                isEscapeSuccessful: true,
                player: { name: 'testPlayer' },
            };

            gameStateServiceMock.gameDataSubjectValue.clientPlayer.name = 'testPlayer';

            EVENT_HANDLERS['escapeAttempt'](testData);

            expect(clientNotifierMock.addLogbookEntry).toHaveBeenCalledWith("Tentative d'évasion réussi", []);
            expect(gameStateServiceMock.updateGameData).toHaveBeenCalledWith(gameStateServiceMock.gameDataSubjectValue);
        });

        it('should log a failed escape attempt when isEscapeSuccessful is false', () => {
            const testData = {
                attemptsLeft: 0,
                isEscapeSuccessful: false,
                player: { name: 'testPlayer' },
            };

            gameStateServiceMock.gameDataSubjectValue.clientPlayer.name = 'testPlayer';

            EVENT_HANDLERS['escapeAttempt'](testData);

            expect(clientNotifierMock.addLogbookEntry).toHaveBeenCalledWith("Tentative d'évasion raté", []);
            expect(gameStateServiceMock.updateGameData).toHaveBeenCalledWith(gameStateServiceMock.gameDataSubjectValue);
        });

        it('should return early if the escape attempt is not from the client player', () => {
            const testData = {
                attemptsLeft: 2,
                isEscapeSuccessful: true,
                player: { name: 'anotherPlayer' },
            };

            gameStateServiceMock.gameDataSubjectValue.clientPlayer.name = 'testPlayer';

            EVENT_HANDLERS['escapeAttempt'](testData);

            expect(clientNotifierMock.addLogbookEntry).not.toHaveBeenCalled();
            expect(gameStateServiceMock.updateGameData).not.toHaveBeenCalled();
        });
    });

    describe('onCombatEndedLog', () => {
        it('should add log entry for combat won when hasEvaded is false', () => {
            socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
                EVENT_HANDLERS[event] = callback;
            });

            service.initializeCombatListeners();

            const testData = {
                winner: MOCK_PLAYER,
                attacker: MOCK_PLAYER,
                defender: { ...MOCK_PLAYER, name: 'Defender' },
                hasEvaded: false,
            };

            EVENT_HANDLERS['combatEndedLog'](testData);

            expect(clientNotifierMock.addLogbookEntry).toHaveBeenCalledWith(`Combat gagné par ${testData.winner.name}`, [
                testData.attacker,
                testData.defender,
            ]);
        });

        it('should add log entry for combat escaped when hasEvaded is true', () => {
            socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
                EVENT_HANDLERS[event] = callback;
            });

            service.initializeCombatListeners();

            const testData = {
                winner: MOCK_PLAYER,
                attacker: MOCK_PLAYER,
                defender: { ...MOCK_PLAYER, name: 'Defender' },
                hasEvaded: true,
            };

            EVENT_HANDLERS['combatEndedLog'](testData);

            expect(clientNotifierMock.addLogbookEntry).toHaveBeenCalledWith(`Combat évadé par ${testData.winner.name}`, [
                testData.attacker,
                testData.defender,
            ]);
        });
    });

    describe('onCombatStartedLog', () => {
        it('should add log entry when combat starts', () => {
            socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
                EVENT_HANDLERS[event] = callback;
            });

            service.initializeCombatListeners();

            const testData = {
                attacker: { ...MOCK_PLAYER, name: 'Attacker' },
                defender: { ...MOCK_PLAYER, name: 'Defender' },
            };

            EVENT_HANDLERS['combatStartedLog'](testData);

            expect(clientNotifierMock.addLogbookEntry).toHaveBeenCalledWith('Combat commencé', [testData.attacker, testData.defender]);
        });
    });

    describe('onAttackResult', () => {
        beforeEach(() => {
            socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
                EVENT_HANDLERS[event] = callback;
            });

            service.initializeCombatListeners();
        });

        it('should log positive attack result when diff > 0', () => {
            const testData = {
                success: true,
                attackScore: { score: 10, diceRolled: 4 },
                defenseScore: { score: 6, diceRolled: 2 },
            };

            EVENT_HANDLERS['attackResult'](testData);

            expect(clientNotifierMock.addLogbookEntry).toHaveBeenCalledWith(
                "Attaque réussie (Dé d'Attaque: 4, Dé de Défense: 2, Résultat d'Attaque: 4)",
            );
        });

        it('should log 0 attack result when diff <= 0', () => {
            const testData = {
                success: false,
                attackScore: { score: 3, diceRolled: 1 },
                defenseScore: { score: 5, diceRolled: 6 },
            };

            EVENT_HANDLERS['attackResult'](testData);

            expect(clientNotifierMock.addLogbookEntry).toHaveBeenCalledWith(
                "Attaque échouée (Dé d'Attaque: 1, Dé de Défense: 6, Résultat d'Attaque: 0)",
            );
        });
    });

    describe('onCombatTurnStarted', () => {
        it('should update current player and game data', () => {
            socketClientServiceMock.on.and.callFake((event: string, callback: (data?: any) => void) => {
                EVENT_HANDLERS[event] = callback;
                return socketClientServiceMock;
            });
            service.initializeCombatListeners();
            const newPlayer = { ...MOCK_PLAYER, name: 'NewFighter' };
            const testData = {
                fighter: newPlayer,
                duration: 30,
                escapeAttemptsLeft: 2,
            };
            expect(EVENT_HANDLERS['combatTurnStarted']).toBeDefined();
            EVENT_HANDLERS['combatTurnStarted'](testData);
            expect(gameStateServiceMock.gameDataSubjectValue.currentPlayer).toEqual(newPlayer);
            expect(gameStateServiceMock.updateGameData).toHaveBeenCalledWith(gameStateServiceMock.gameDataSubjectValue);
        });
    });
});
