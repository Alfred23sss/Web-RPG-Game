/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DiceType } from '@app/interfaces/Dice';
import { Player } from '@app/interfaces/Player';
import { CombatHelperService } from '@app/services/combat-helper/combat-helper.service';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

describe('GameCombatService', () => {
    let service: GameCombatService;
    let gameSessionService: jest.Mocked<GameSessionService>;
    let combatHelper: jest.Mocked<CombatHelperService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const mockPlayer = (name: string, speed: number): Player => ({
        name,
        speed,
        attack: { value: 5, bonusDice: DiceType.D6 },
        defense: { value: 4, bonusDice: DiceType.D4 },
        hp: { current: 10, max: 10 },
        movementPoints: 3,
        actionPoints: 3,
        inventory: [null, null],
        avatar: '',
        isAdmin: false,
        hasAbandoned: false,
        isActive: false,
        combatWon: 0,
        vitality: 0,
    });

    const mockCombatState = () => ({
        attacker: mockPlayer('attacker', 6),
        defender: mockPlayer('defender', 4),
        currentFighter: mockPlayer('attacker', 6),
        remainingEscapeAttempts: new Map([
            ['attacker', 2],
            ['defender', 2],
        ]),
        combatTurnTimers: null,
        combatCountdownInterval: null,
        combatTurnTimeRemaining: 5,
        pausedGameTurnTimeRemaining: 30,
        playerPerformedAction: false,
        isDebugMode: false,
        hasEvaded: false,
    });

    const mockGameSession = {
        game: {
            grid: [[]],
            id: 'test',
            name: 'Test Game',
            size: 'medium',
            mode: 'standard',
            lastModified: new Date(),
            isVisible: true,
            previewImage: '',
            description: '',
        },
        turn: {
            orderedPlayers: [],
            currentPlayer: null,
            currentTurnCountdown: 0,
            turnTimers: null,
            isTransitionPhase: false,
            countdownInterval: null,
            isInCombat: false,
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameCombatService,
                {
                    provide: GameSessionService,
                    useValue: {
                        getPlayers: jest.fn(),
                        endTurn: jest.fn(),
                        getGameSession: jest.fn().mockReturnValue(mockGameSession),
                        setCombatState: jest.fn(),
                        isCurrentPlayer: jest.fn(),
                        pauseGameTurn: jest.fn(),
                        resumeGameTurn: jest.fn(),
                        endGameSession: jest.fn(),
                        updateGameSessionPlayerList: jest.fn(),
                        emitGridUpdate: jest.fn(),
                    },
                },
                {
                    provide: CombatHelperService,
                    useValue: {
                        determineCombatOrder: jest.fn(),
                        getRandomAttackScore: jest.fn(),
                        getRandomDefenseScore: jest.fn(),
                        resetLoserPlayerPosition: jest.fn(),
                        isValidAttacker: jest.fn(),
                        getDefender: jest.fn(),
                        extractDiceValue: jest.fn().mockReturnValue(6),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: { emit: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<GameCombatService>(GameCombatService);
        gameSessionService = module.get(GameSessionService);
        combatHelper = module.get(CombatHelperService);
        eventEmitter = module.get(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
        jest.useRealTimers();

        if (service && service['combatStates']) {
            Object.keys(service['combatStates']).forEach((accessCode) => {
                const combatState = service['combatStates'][accessCode];
                if (combatState) {
                    if (combatState.combatTurnTimers) {
                        clearTimeout(combatState.combatTurnTimers);
                    }

                    if (combatState.combatCountdownInterval) {
                        clearInterval(combatState.combatCountdownInterval);
                    }
                }
            });

            service['combatStates'] = {};
        }

        if (service && service['combatTimers']) {
            Object.keys(service['combatTimers']).forEach((key) => {
                clearTimeout(service['combatTimers'][key]);
                clearInterval(service['combatTimers'][key]);
            });
            service['combatTimers'] = {};
        }

        if (mockGameSession && mockGameSession.turn && mockGameSession.turn.turnTimers) {
            clearTimeout(mockGameSession.turn.turnTimers);
            mockGameSession.turn.turnTimers = null;
        }

        if (mockGameSession && mockGameSession.turn && mockGameSession.turn.countdownInterval) {
            clearInterval(mockGameSession.turn.countdownInterval);
            mockGameSession.turn.countdownInterval = null;
        }
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleCombatSessionAbandon', () => {
        it('should handle combat session abandon when the player is in combat', () => {
            const accessCode = 'testAccessCode';
            const playerName = 'attacker';
            const combatState = mockCombatState();

            service['combatStates'][accessCode] = combatState;

            gameSessionService.getPlayers.mockReturnValue([combatState.attacker, combatState.defender]);

            const updateWinningPlayerAfterCombatSpy = jest.spyOn(service as any, 'updateWinningPlayerAfterCombat' as any);

            service.handleCombatSessionAbandon(accessCode, playerName);

            expect(updateWinningPlayerAfterCombatSpy).toHaveBeenCalledWith(combatState.currentFighter, accessCode);

            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player.list', {
                players: [combatState.attacker, combatState.defender],
                accessCode,
            });

            expect(service['combatStates'][accessCode]).toBeUndefined();
        });

        it('should not handle combat session abandon if the combat state does not exist', () => {
            const accessCode = 'testAccessCode';
            const playerName = 'attacker';

            gameSessionService.getPlayers.mockReturnValue([]);

            const updateWinningPlayerAfterCombatSpy = jest.spyOn(service, 'updateWinningPlayerAfterCombat' as any);

            service.handleCombatSessionAbandon(accessCode, playerName);

            expect(updateWinningPlayerAfterCombatSpy).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });
    });

    describe('endCombatTurn', () => {
        it('should do nothing if combat state does not exist', () => {
            const accessCode = 'testAccessCode';

            service['combatStates'][accessCode] = undefined;

            const resetCombatTimersSpy = jest.spyOn(service, 'resetCombatTimers' as any);
            const getNextCombatFighterSpy = jest.spyOn(service, 'getNextCombatFighter' as any);
            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn' as any);

            service.endCombatTurn(accessCode);

            expect(resetCombatTimersSpy).not.toHaveBeenCalled();
            expect(getNextCombatFighterSpy).not.toHaveBeenCalled();
            expect(startCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should reset timers, get the next fighter, and start the next combat turn if combat state exists', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const nextFighter = mockPlayer('nextFighter', 5);

            service['combatStates'][accessCode] = combatState;

            const resetCombatTimersSpy = jest.spyOn(service, 'resetCombatTimers' as any);
            const getNextCombatFighterSpy = jest.spyOn(service, 'getNextCombatFighter' as any).mockReturnValue(nextFighter);
            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn' as any);

            service.endCombatTurn(accessCode);

            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(getNextCombatFighterSpy).toHaveBeenCalledWith(accessCode);
            expect(startCombatTurnSpy).toHaveBeenCalledWith(accessCode, nextFighter);
        });
    });

    describe('performAttack', () => {
        it('should do nothing if combat state does not exist', () => {
            const accessCode = 'testAccessCode';
            const attackerName = 'attacker';
            service['combatStates'][accessCode] = undefined;
            const isValidAttackerSpy = jest.spyOn(combatHelper, 'isValidAttacker');
            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const calculateAttackResultSpy = jest.spyOn(service as any, 'calculateAttackResult');
            service.performAttack(accessCode, attackerName);
            expect(isValidAttackerSpy).not.toHaveBeenCalled();
            expect(resetCombatTimersSpy).not.toHaveBeenCalled();
            expect(calculateAttackResultSpy).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should do nothing if attacker is not valid', () => {
            const accessCode = 'testAccessCode';
            const attackerName = 'invalidAttacker';
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;
            combatHelper.isValidAttacker.mockReturnValue(false);
            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const calculateAttackResultSpy = jest.spyOn(service as any, 'calculateAttackResult');
            service.performAttack(accessCode, attackerName);
            expect(combatHelper.isValidAttacker).toHaveBeenCalledWith(combatState, attackerName);
            expect(resetCombatTimersSpy).not.toHaveBeenCalled();
            expect(calculateAttackResultSpy).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should process successful attack', () => {
            const accessCode = 'testAccessCode';
            const attackerName = 'attacker';
            const combatState = mockCombatState();
            const defenderPlayer = mockPlayer('defender', 4);

            defenderPlayer.hp.current = 5;

            service['combatStates'][accessCode] = combatState;
            combatHelper.isValidAttacker.mockReturnValue(true);

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const calculateAttackResultSpy = jest.spyOn(service as any, 'calculateAttackResult').mockReturnValue({
                attackSuccessful: true,
                attackerScore: 10,
                defenseScore: 5,
                defenderPlayer,
            });
            const handleSuccessfulAttackSpy = jest.spyOn(service as any, 'handleSuccessfulAttack');
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');

            jest.spyOn(eventEmitter, 'emit').mockClear();

            service.performAttack(accessCode, attackerName);

            expect(combatHelper.isValidAttacker).toHaveBeenCalledWith(combatState, attackerName);
            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(calculateAttackResultSpy).toHaveBeenCalledWith(combatState, accessCode);

            expect(combatState.playerPerformedAction).toBe(true);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'game.combat.attack.result',
                expect.objectContaining({
                    attackSuccessful: true,
                    attackerScore: 10,
                    defenseScore: 5,
                    defenderPlayer,
                }),
            );

            expect(handleSuccessfulAttackSpy).toHaveBeenCalledWith(combatState, 10, 5, defenderPlayer, accessCode);
            expect(endCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should end combat turn when attack is unsuccessful', () => {
            const accessCode = 'testAccessCode';
            const attackerName = 'attacker';
            const combatState = mockCombatState();
            const defenderPlayer = mockPlayer('defender', 4);
            service['combatStates'][accessCode] = combatState;
            combatHelper.isValidAttacker.mockReturnValue(true);

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const calculateAttackResultSpy = jest.spyOn(service as any, 'calculateAttackResult').mockReturnValue({
                attackSuccessful: false,
                attackerScore: 5,
                defenseScore: 10,
                defenderPlayer,
            });
            const handleSuccessfulAttackSpy = jest.spyOn(service as any, 'handleSuccessfulAttack');
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');

            jest.spyOn(eventEmitter, 'emit').mockClear();

            service.performAttack(accessCode, attackerName);

            service['combatStates'][accessCode].playerPerformedAction = true;

            expect(combatHelper.isValidAttacker).toHaveBeenCalledWith(combatState, attackerName);
            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(calculateAttackResultSpy).toHaveBeenCalledWith(combatState, accessCode);
            expect(combatState.playerPerformedAction).toBe(true);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'game.combat.attack.result',
                expect.objectContaining({
                    attackSuccessful: false,
                    attackerScore: 5,
                    defenseScore: 10,
                    defenderPlayer,
                }),
            );

            expect(handleSuccessfulAttackSpy).not.toHaveBeenCalled();
            expect(endCombatTurnSpy).toHaveBeenCalledWith(accessCode);
        });
    });

    describe('attemptEscape', () => {
        it('should do nothing if combat state does not exist', () => {
            const accessCode = 'testAccessCode';
            const player = mockPlayer('player', 5);
            service['combatStates'][accessCode] = undefined;
            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');
            service.attemptEscape(accessCode, player);
            expect(resetCombatTimersSpy).not.toHaveBeenCalled();
            expect(endCombatTurnSpy).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should do nothing if player is not the current fighter', () => {
            const accessCode = 'testAccessCode';
            const player = mockPlayer('notCurrentFighter', 5);
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;
            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');
            service.attemptEscape(accessCode, player);
            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(endCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should handle failed escape attempt', () => {
            const accessCode = 'testAccessCode';
            const player = mockPlayer('attacker', 6);
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;
            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');
            jest.clearAllMocks();
            jest.spyOn(global.Math, 'random').mockReturnValue(0.9);
            service.attemptEscape(accessCode, player);
            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.escape.failed', expect.any(Object));
            expect(combatState.remainingEscapeAttempts.get(player.name)).toBe(1);
            expect(endCombatTurnSpy).toHaveBeenCalledWith(accessCode);
        });

        it('should handle successful escape attempt', () => {
            const accessCode = 'testAccessCode';
            const player = mockPlayer('attacker', 6);
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const resetHealthSpy = jest.spyOn(service as any, 'resetHealth');
            const endCombatSpy = jest.spyOn(service, 'endCombat');

            jest.clearAllMocks();
            jest.spyOn(global.Math, 'random').mockReturnValue(0.1);

            service.attemptEscape(accessCode, player);

            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(combatState.remainingEscapeAttempts.get(player.name)).toBe(1);
            expect(resetHealthSpy).toHaveBeenCalledWith([combatState.attacker, combatState.defender], accessCode);
            expect(combatState.hasEvaded).toBe(true);
            expect(endCombatSpy).toHaveBeenCalledWith(accessCode, true);
        });
    });

    describe('checkPlayerWon', () => {
        it('should return true and end game session when player reaches win condition', () => {
            const WIN_CONDITION = 3;
            const accessCode = 'testAccessCode';
            const player = mockPlayer('winner', 5);
            player.combatWon = WIN_CONDITION;

            const endGameSessionSpy = jest.spyOn(gameSessionService, 'endGameSession');

            const result = service['checkPlayerWon'](accessCode, player);

            expect(result).toBe(true);
            expect(endGameSessionSpy).toHaveBeenCalledWith(accessCode, player.name);
        });

        it('should return false when player has not reached win condition', () => {
            const WIN_CONDITION = 3;
            const accessCode = 'testAccessCode';
            const player = mockPlayer('notWinner', 5);
            player.combatWon = WIN_CONDITION - 1;

            const endGameSessionSpy = jest.spyOn(gameSessionService, 'endGameSession');

            const result = service['checkPlayerWon'](accessCode, player);

            expect(result).toBe(false);
            expect(endGameSessionSpy).not.toHaveBeenCalled();
        });
    });

    describe('endCombat', () => {
        it('should do nothing if combat state does not exist', () => {
            const accessCode = 'testAccessCode';
            service['combatStates'][accessCode] = undefined;

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');

            service.endCombat(accessCode);

            expect(resetCombatTimersSpy).not.toHaveBeenCalled();
            expect(emitEventSpy).not.toHaveBeenCalled();
        });

        it('should reset timers and emit event even if game session does not exist', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');

            gameSessionService.getGameSession.mockReturnValue(null);

            service.endCombat(accessCode);

            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(emitEventSpy).toHaveBeenCalledWith(
                'game.combat.ended',
                expect.objectContaining({
                    attacker: combatState.attacker,
                    defender: combatState.defender,
                    currentFighter: combatState.currentFighter,
                    hasEvaded: combatState.hasEvaded,
                }),
            );
            expect(service['combatStates'][accessCode]).toBeUndefined();
        });

        it('should resume game turn if escape is true', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;

            service.endCombat(accessCode, true);

            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(accessCode, false);
            expect(gameSessionService.resumeGameTurn).toHaveBeenCalledWith(accessCode, combatState.pausedGameTurnTimeRemaining);
            expect(gameSessionService.endTurn).not.toHaveBeenCalled();
        });

        it('should resume game turn if current fighter is not the current player', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;

            gameSessionService.isCurrentPlayer.mockReturnValue(false);

            service.endCombat(accessCode);

            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(accessCode, false);
            expect(gameSessionService.endTurn).toHaveBeenCalledWith(accessCode);
            expect(gameSessionService.resumeGameTurn).not.toHaveBeenCalled();
        });

        it('should end turn if current fighter is the current player', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;

            gameSessionService.isCurrentPlayer.mockReturnValue(true);

            service.endCombat(accessCode);

            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(accessCode, false);
            expect(gameSessionService.resumeGameTurn).toHaveBeenCalledWith(accessCode, combatState.pausedGameTurnTimeRemaining);
            expect(gameSessionService.endTurn).not.toHaveBeenCalled();
        });
    });

    describe('isCombatActive', () => {
        it('should return true when combat state exists for the given access code', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;

            const result = service.isCombatActive(accessCode);

            expect(result).toBe(true);
        });

        it('should return false when combat state does not exist for the given access code', () => {
            const accessCode = 'testAccessCode';
            service['combatStates'][accessCode] = undefined;

            const result = service.isCombatActive(accessCode);

            expect(result).toBe(false);
        });
    });

    describe('getCombatState', () => {
        it('should return the combat state when it exists for the given access code', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            service['combatStates'][accessCode] = combatState;

            const result = service.getCombatState(accessCode);

            expect(result).toEqual(combatState);
        });

        it('should return null when combat state does not exist for the given access code', () => {
            const accessCode = 'testAccessCode';
            service['combatStates'][accessCode] = undefined;

            const result = service.getCombatState(accessCode);

            expect(result).toBeNull();
        });
    });

    describe('startCombat', () => {
        it('should do nothing if attacker is not found', () => {
            const accessCode = 'testAccessCode';
            const attackerId = 'nonExistentAttacker';
            const defenderId = 'defender';

            gameSessionService.getPlayers.mockReturnValue([mockPlayer('defender', 4)]);

            const initialiseCombatStateSpy = jest.spyOn(service as any, 'initialiseCombatState');
            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');
            const startCombatTurnSpy = jest.spyOn(service as any, 'startCombatTurn');

            service.startCombat(accessCode, attackerId, defenderId);

            expect(gameSessionService.pauseGameTurn).not.toHaveBeenCalled();
            expect(initialiseCombatStateSpy).not.toHaveBeenCalled();
            expect(gameSessionService.setCombatState).not.toHaveBeenCalled();
            expect(combatHelper.determineCombatOrder).not.toHaveBeenCalled();
            expect(emitEventSpy).not.toHaveBeenCalled();
            expect(startCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should do nothing if defender is not found', () => {
            const accessCode = 'testAccessCode';
            const attackerId = 'attacker';
            const defenderId = 'nonExistentDefender';

            gameSessionService.getPlayers.mockReturnValue([mockPlayer('attacker', 6)]);

            const initialiseCombatStateSpy = jest.spyOn(service as any, 'initialiseCombatState');

            service.startCombat(accessCode, attackerId, defenderId);

            expect(gameSessionService.pauseGameTurn).not.toHaveBeenCalled();
            expect(initialiseCombatStateSpy).not.toHaveBeenCalled();
        });

        it('should start combat with found players', () => {
            const accessCode = 'testAccessCode';
            const attackerId = 'attacker';
            const defenderId = 'defender';
            const attacker = mockPlayer('attacker', 6);
            const defender = mockPlayer('defender', 4);
            const pausedTimeRemaining = 30;

            gameSessionService.getPlayers.mockReturnValue([attacker, defender]);
            gameSessionService.pauseGameTurn.mockReturnValue(pausedTimeRemaining);
            combatHelper.determineCombatOrder.mockReturnValue([attacker, defender]);

            const initialiseCombatStateSpy = jest.spyOn(service as any, 'initialiseCombatState');
            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');
            const startCombatTurnSpy = jest.spyOn(service as any, 'startCombatTurn');

            service.startCombat(accessCode, attackerId, defenderId);

            expect(gameSessionService.pauseGameTurn).toHaveBeenCalledWith(accessCode);
            expect(initialiseCombatStateSpy).toHaveBeenCalledWith(accessCode, attacker, defender, pausedTimeRemaining, false);
            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(accessCode, true);
            expect(combatHelper.determineCombatOrder).toHaveBeenCalledWith(attacker, defender);
            expect(emitEventSpy).toHaveBeenCalledWith('game.combat.started', {
                accessCode,
                attacker,
                defender,
                currentPlayerName: attacker.name,
            });
            expect(startCombatTurnSpy).toHaveBeenCalledWith(accessCode, attacker);
        });

        it('should start combat in debug mode when specified', () => {
            const accessCode = 'testAccessCode';
            const attackerId = 'attacker';
            const defenderId = 'defender';
            const attacker = mockPlayer('attacker', 6);
            const defender = mockPlayer('defender', 4);
            const pausedTimeRemaining = 30;
            const isDebugMode = true;

            gameSessionService.getPlayers.mockReturnValue([attacker, defender]);
            gameSessionService.pauseGameTurn.mockReturnValue(pausedTimeRemaining);
            combatHelper.determineCombatOrder.mockReturnValue([attacker, defender]);

            const initialiseCombatStateSpy = jest.spyOn(service as any, 'initialiseCombatState');

            service.startCombat(accessCode, attackerId, defenderId, isDebugMode);

            expect(initialiseCombatStateSpy).toHaveBeenCalledWith(accessCode, attacker, defender, pausedTimeRemaining, isDebugMode);
        });
    });

    describe('initialiseCombatState', () => {
        it('should initialize combat state with correct properties', () => {
            const accessCode = 'testAccessCode';
            const attacker = mockPlayer('attacker', 6);
            const defender = mockPlayer('defender', 4);
            const pausedTimeRemaining = 30;
            const isDebugMode = false;
            const MAX_ESCAPE_ATTEMPTS = 2;
            service['initialiseCombatState'](accessCode, attacker, defender, pausedTimeRemaining, isDebugMode);
            const combatState = service['combatStates'][accessCode];
            expect(combatState).toBeDefined();
            expect(combatState.attacker).toEqual(attacker);
            expect(combatState.defender).toEqual(defender);
            expect(combatState.currentFighter).toBeNull();
            expect(combatState.remainingEscapeAttempts.get(attacker.name)).toBe(MAX_ESCAPE_ATTEMPTS);
            expect(combatState.remainingEscapeAttempts.get(defender.name)).toBe(MAX_ESCAPE_ATTEMPTS);
            expect(combatState.combatTurnTimers).toBeNull();
            expect(combatState.combatCountdownInterval).toBeNull();
            expect(combatState.combatTurnTimeRemaining).toBe(0);
            expect(combatState.pausedGameTurnTimeRemaining).toBe(pausedTimeRemaining);
            expect(combatState.playerPerformedAction).toBe(false);
            expect(combatState.isDebugMode).toBe(isDebugMode);
            expect(combatState.hasEvaded).toBe(false);
        });

        it('should initialize combat state with debug mode enabled', () => {
            const accessCode = 'testAccessCode';
            const attacker = mockPlayer('attacker', 6);
            const defender = mockPlayer('defender', 4);
            const pausedTimeRemaining = 30;
            const isDebugMode = true;
            service['initialiseCombatState'](accessCode, attacker, defender, pausedTimeRemaining, isDebugMode);
            const combatState = service['combatStates'][accessCode];
            expect(combatState.isDebugMode).toBe(true);
        });

        it('should replace existing combat state for the same access code', () => {
            const accessCode = 'testAccessCode';
            const attacker1 = mockPlayer('attacker1', 6);
            const defender1 = mockPlayer('defender1', 4);
            const attacker2 = mockPlayer('attacker2', 5);
            const defender2 = mockPlayer('defender2', 3);
            const pausedTimeRemaining = 30;
            const isDebugMode = false;
            service['initialiseCombatState'](accessCode, attacker1, defender1, pausedTimeRemaining, isDebugMode);
            service['initialiseCombatState'](accessCode, attacker2, defender2, pausedTimeRemaining, isDebugMode);
            const combatState = service['combatStates'][accessCode];
            expect(combatState.attacker).toEqual(attacker2);
            expect(combatState.defender).toEqual(defender2);
            expect(combatState.remainingEscapeAttempts.get(attacker2.name)).toBeDefined();
            expect(combatState.remainingEscapeAttempts.get(defender2.name)).toBeDefined();
        });
    });

    describe('updateWinningPlayerAfterCombat', () => {
        it('should reset hp, increment combatWon, and update player list', () => {
            const accessCode = 'testAccessCode';
            const player = mockPlayer('winner', 5);
            player.hp.current = 5;
            player.hp.max = 10;
            player.combatWon = 1;

            const mockPlayers = [player, mockPlayer('otherPlayer', 4)];
            gameSessionService.getPlayers.mockReturnValue(mockPlayers);

            const checkPlayerWonSpy = jest.spyOn(service as any, 'checkPlayerWon').mockReturnValue(false);
            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');

            service['updateWinningPlayerAfterCombat'](player, accessCode);

            expect(player.hp.current).toBe(player.hp.max);
            expect(player.combatWon).toBe(2);
            expect(checkPlayerWonSpy).toHaveBeenCalledWith(accessCode, player);
            expect(gameSessionService.updateGameSessionPlayerList).toHaveBeenCalledWith(accessCode, player.name, player);
            expect(emitEventSpy).toHaveBeenCalledWith('update.player', { player });
            expect(emitEventSpy).toHaveBeenCalledWith('update.player.list', {
                players: mockPlayers,
                accessCode,
            });
        });

        it('should end game session when player has won', () => {
            const accessCode = 'testAccessCode';
            const player = mockPlayer('winner', 5);
            player.hp.current = 5;

            const mockPlayers = [player];
            gameSessionService.getPlayers.mockReturnValue(mockPlayers);

            const checkPlayerWonSpy = jest.spyOn(service as any, 'checkPlayerWon').mockReturnValue(true);

            service['updateWinningPlayerAfterCombat'](player, accessCode);

            expect(checkPlayerWonSpy).toHaveBeenCalledWith(accessCode, player);
            expect(gameSessionService.endGameSession).toHaveBeenCalledWith(accessCode, player.name);
        });

        it('should not end game session when player has not won', () => {
            const accessCode = 'testAccessCode';
            const player = mockPlayer('winner', 5);

            const mockPlayers = [player];
            gameSessionService.getPlayers.mockReturnValue(mockPlayers);

            const checkPlayerWonSpy = jest.spyOn(service as any, 'checkPlayerWon').mockReturnValue(false);

            service['updateWinningPlayerAfterCombat'](player, accessCode);

            expect(checkPlayerWonSpy).toHaveBeenCalledWith(accessCode, player);
            expect(gameSessionService.endGameSession).not.toHaveBeenCalled();
        });
    });

    describe('resetHealth', () => {
        it('should reset health of all players to maximum and update them', () => {
            const accessCode = 'testAccessCode';
            const player1 = mockPlayer('player1', 5);
            const player2 = mockPlayer('player2', 4);

            player1.hp.current = 3;
            player1.hp.max = 10;
            player2.hp.current = 2;
            player2.hp.max = 8;

            const players = [player1, player2];

            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');

            (service as any).resetHealth(players, accessCode);

            expect(player1.hp.current).toBe(player1.hp.max);
            expect(player2.hp.current).toBe(player2.hp.max);

            expect(emitEventSpy).toHaveBeenCalledTimes(2);
            expect(emitEventSpy).toHaveBeenCalledWith('update.player', { player: player1 });
            expect(emitEventSpy).toHaveBeenCalledWith('update.player', { player: player2 });

            expect(gameSessionService.updateGameSessionPlayerList).toHaveBeenCalledTimes(2);
            expect(gameSessionService.updateGameSessionPlayerList).toHaveBeenCalledWith(accessCode, player1.name, player1);
            expect(gameSessionService.updateGameSessionPlayerList).toHaveBeenCalledWith(accessCode, player2.name, player2);
        });

        it('should handle empty players array', () => {
            const accessCode = 'testAccessCode';
            const players: Player[] = [];

            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');

            (service as any).resetHealth(players, accessCode);

            expect(emitEventSpy).not.toHaveBeenCalled();
            expect(gameSessionService.updateGameSessionPlayerList).not.toHaveBeenCalled();
        });
    });

    describe('resetCombatTimers', () => {
        it('should clear timers when they exist', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();

            const mockTimer = setTimeout(() => {}, 1000);
            const mockInterval = setInterval(() => {}, 1000);

            combatState.combatTurnTimers = mockTimer;
            combatState.combatCountdownInterval = mockInterval;

            service['combatStates'][accessCode] = combatState;

            jest.spyOn(global, 'clearTimeout');
            jest.spyOn(global, 'clearInterval');

            (service as any).resetCombatTimers(accessCode);

            expect(global.clearTimeout).toHaveBeenCalledWith(mockTimer);
            expect(global.clearInterval).toHaveBeenCalledWith(mockInterval);
            expect(combatState.combatTurnTimers).toBeNull();
            expect(combatState.combatCountdownInterval).toBeNull();
        });

        it('should handle null timers gracefully', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();

            combatState.combatTurnTimers = null;
            combatState.combatCountdownInterval = null;

            service['combatStates'][accessCode] = combatState;

            jest.spyOn(global, 'clearTimeout');
            jest.spyOn(global, 'clearInterval');

            (service as any).resetCombatTimers(accessCode);

            expect(global.clearTimeout).not.toHaveBeenCalled();
            expect(global.clearInterval).not.toHaveBeenCalled();
            expect(combatState.combatTurnTimers).toBeNull();
            expect(combatState.combatCountdownInterval).toBeNull();
        });

        it('should handle undefined combat state', () => {
            const accessCode = 'nonExistentAccessCode';

            service['combatStates'][accessCode] = undefined;

            expect(() => {
                (service as any).resetCombatTimers(accessCode);
            }).toThrow();
        });
    });

    describe('calculateAttackResult', () => {
        it('should calculate successful attack result when attacker score is higher', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore = 10;
            const defenseScore = 5;

            combatHelper.getRandomAttackScore.mockReturnValue(attackerScore);
            combatHelper.getRandomDefenseScore.mockReturnValue(defenseScore);

            const result = (service as any).calculateAttackResult(combatState, accessCode);

            expect(combatHelper.getRandomAttackScore).toHaveBeenCalledWith(
                combatState.currentFighter,
                combatState.isDebugMode,
                mockGameSession.game.grid,
            );
            expect(combatHelper.getRandomDefenseScore).toHaveBeenCalledWith(combatState.attacker, combatState.isDebugMode, mockGameSession.game.grid);
            expect(result).toEqual({
                attackSuccessful: true,
                attackerScore,
                defenseScore,
                defenderPlayer: combatState.attacker,
            });
        });

        it('should calculate failed attack result when defender score is higher', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore = 5;
            const defenseScore = 10;

            combatHelper.getRandomAttackScore.mockReturnValue(attackerScore);
            combatHelper.getRandomDefenseScore.mockReturnValue(defenseScore);

            const result = (service as any).calculateAttackResult(combatState, accessCode);

            expect(result.attackSuccessful).toBe(false);
            expect(result.attackerScore).toBe(attackerScore);
            expect(result.defenseScore).toBe(defenseScore);
        });

        it('should correctly identify defender when current fighter is the defender', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();

            combatState.currentFighter = combatState.defender;

            const result = (service as any).calculateAttackResult(combatState, accessCode);

            expect(result.defenderPlayer).toBe(combatState.attacker);
        });

        it('should handle debug mode correctly', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            combatState.isDebugMode = true;

            (service as any).calculateAttackResult(combatState, accessCode);

            expect(combatHelper.getRandomAttackScore).toHaveBeenCalledWith(combatState.currentFighter, true, mockGameSession.game.grid);
            expect(combatHelper.getRandomDefenseScore).toHaveBeenCalledWith(combatState.attacker, true, mockGameSession.game.grid);
        });
    });

    describe('handleSuccessfulAttack', () => {
        it('should decrease defender HP by attack damage', () => {
            // Arrange
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore = 8;
            const defenseScore = 3;
            const defenderPlayer = { ...mockPlayer('defender', 4), hp: { current: 10, max: 10 } };
            const expectedDamage = attackerScore - defenseScore; // 5
            const expectedNewHp = defenderPlayer.hp.current - expectedDamage; // 5

            // Act
            (service as any).handleSuccessfulAttack(combatState, attackerScore, defenseScore, defenderPlayer, accessCode);

            // Assert
            expect(defenderPlayer.hp.current).toBe(expectedNewHp);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player', { player: defenderPlayer });
        });

        it('should end combat when defender HP reaches zero', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore = 15;
            const defenseScore = 3;
            const defenderPlayer = { ...mockPlayer('defender', 4), hp: { current: 5, max: 10 } };

            const handleCombatEndSpy = jest.spyOn(service as any, 'handleCombatEnd').mockImplementation();

            (service as any).handleSuccessfulAttack(combatState, attackerScore, defenseScore, defenderPlayer, accessCode);

            expect(defenderPlayer.hp.current).toBe(0);
            expect(handleCombatEndSpy).toHaveBeenCalledWith(combatState, defenderPlayer, accessCode);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player', { player: defenderPlayer });
        });

        it('should end combat turn when defender HP is greater than zero', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore = 8;
            const defenseScore = 3;
            const defenderPlayer = { ...mockPlayer('defender', 4), hp: { current: 10, max: 10 } };

            const endCombatTurnSpy = jest.spyOn(service as any, 'endCombatTurn').mockImplementation();

            (service as any).handleSuccessfulAttack(combatState, attackerScore, defenseScore, defenderPlayer, accessCode);

            expect(defenderPlayer.hp.current).toBe(5);
            expect(endCombatTurnSpy).toHaveBeenCalledWith(accessCode);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player', { player: defenderPlayer });
        });
    });
});
