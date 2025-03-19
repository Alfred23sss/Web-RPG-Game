/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
import { CombatState } from '@app/interfaces/CombatState';
import { DiceType } from '@app/interfaces/Dice';
import { Player } from '@app/interfaces/Player';
import { CombatHelperService } from '@app/services/combat-helper/combat-helper.service';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

const ACCESS_CODE = 'test-code';
const DEFENDER_NAME = 'defender';
const ATTACKER_NAME = 'attacker';
const PLAYER_NAME = 'player';
const WIN_CONDITION = 3;

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
        beginnerPlayer: mockPlayer(PLAYER_NAME, 6),
    },
};

const MOCK_PLAYER = mockPlayer(PLAYER_NAME, 6);

describe('GameCombatService', () => {
    let service: GameCombatService;
    let gameSessionService: jest.Mocked<GameSessionService>;
    let combatHelper: jest.Mocked<CombatHelperService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

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
            const accessCode = ACCESS_CODE;
            const playerName = 'attacker';
            const combatState = mockCombatState();

            service['combatStates'][ACCESS_CODE] = combatState;
            gameSessionService.getPlayers.mockReturnValue([combatState.attacker, combatState.defender]);
            const updateWinningPlayerAfterCombatSpy = jest.spyOn(service as any, 'updateWinningPlayerAfterCombat' as any);
            service.handleCombatSessionAbandon(ACCESS_CODE, playerName);

            expect(updateWinningPlayerAfterCombatSpy).toHaveBeenCalledWith(combatState.currentFighter, ACCESS_CODE);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player.list', {
                players: [combatState.attacker, combatState.defender],
                accessCode,
            });
            expect(service['combatStates'][ACCESS_CODE]).toBeUndefined();
        });

        it('should not handle combat session abandon if the combat state does not exist', () => {
            const playerName = 'attacker';

            gameSessionService.getPlayers.mockReturnValue([]);

            const updateWinningPlayerAfterCombatSpy = jest.spyOn(service, 'updateWinningPlayerAfterCombat' as any);

            service.handleCombatSessionAbandon(ACCESS_CODE, playerName);

            expect(updateWinningPlayerAfterCombatSpy).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should update defender when abandoning player is NOT the current fighter', () => {
            const combatState = mockCombatState();
            combatState.currentFighter = combatState.attacker;

            service['combatStates'][ACCESS_CODE] = combatState;
            gameSessionService.getPlayers.mockReturnValue([combatState.attacker, combatState.defender]);
            const updateWinningPlayerSpy = jest.spyOn(service as any, 'updateWinningPlayerAfterCombat');
            service.handleCombatSessionAbandon(ACCESS_CODE, DEFENDER_NAME);

            expect(updateWinningPlayerSpy).toHaveBeenCalledWith(combatState.defender, ACCESS_CODE);
            expect(service['combatStates'][ACCESS_CODE]).toBeUndefined();
        });
    });

    describe('endCombatTurn', () => {
        it('should reset timers, get the next fighter, and start the next combat turn if combat state exists', () => {
            const combatState = mockCombatState();
            const nextFighter = mockPlayer('nextFighter', 5);

            service['combatStates'][ACCESS_CODE] = combatState;

            const resetCombatTimersSpy = jest.spyOn(service, 'resetCombatTimers' as any);
            const getNextCombatFighterSpy = jest.spyOn(service, 'getNextCombatFighter' as any).mockReturnValue(nextFighter);
            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn' as any);

            service.endCombatTurn(ACCESS_CODE);

            expect(resetCombatTimersSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(getNextCombatFighterSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(startCombatTurnSpy).toHaveBeenCalledWith(ACCESS_CODE, nextFighter);
        });
    });

    describe('performAttack', () => {
        it('should do nothing if combat state does not exist', () => {
            service['combatStates'][ACCESS_CODE] = undefined;
            const isValidAttackerSpy = jest.spyOn(combatHelper, 'isValidAttacker');
            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const calculateAttackResultSpy = jest.spyOn(service as any, 'calculateAttackResult');
            service.performAttack(ACCESS_CODE, ATTACKER_NAME);
            expect(isValidAttackerSpy).not.toHaveBeenCalled();
            expect(resetCombatTimersSpy).not.toHaveBeenCalled();
            expect(calculateAttackResultSpy).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should process successful attack', () => {
            const combatState = mockCombatState();
            const defenderPlayer = mockPlayer(DEFENDER_NAME, 4);

            defenderPlayer.hp.current = 5;

            service['combatStates'][ACCESS_CODE] = combatState;
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

            service.performAttack(ACCESS_CODE, ATTACKER_NAME);

            expect(combatHelper.isValidAttacker).toHaveBeenCalledWith(combatState, ATTACKER_NAME);
            expect(resetCombatTimersSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(calculateAttackResultSpy).toHaveBeenCalledWith(combatState, ACCESS_CODE);

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

            expect(handleSuccessfulAttackSpy).toHaveBeenCalledWith(combatState, 10, 5, defenderPlayer, ACCESS_CODE);
            expect(endCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should end combat turn when attack is unsuccessful', () => {
            const combatState = mockCombatState();
            const defenderPlayer = mockPlayer(DEFENDER_NAME, 4);
            service['combatStates'][ACCESS_CODE] = combatState;
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

            service.performAttack(ACCESS_CODE, ATTACKER_NAME);

            service['combatStates'][ACCESS_CODE].playerPerformedAction = true;

            expect(combatHelper.isValidAttacker).toHaveBeenCalledWith(combatState, ATTACKER_NAME);
            expect(resetCombatTimersSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(calculateAttackResultSpy).toHaveBeenCalledWith(combatState, ACCESS_CODE);
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
            expect(endCombatTurnSpy).toHaveBeenCalledWith(ACCESS_CODE);
        });
    });

    describe('attemptEscape', () => {
        it('should do nothing if combat state does not exist', () => {
            const player = mockPlayer(PLAYER_NAME, 5);
            service['combatStates'][ACCESS_CODE] = undefined;
            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');
            service.attemptEscape(ACCESS_CODE, player);
            expect(resetCombatTimersSpy).not.toHaveBeenCalled();
            expect(endCombatTurnSpy).not.toHaveBeenCalled();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should do nothing if player is not the current fighter', () => {
            const player = mockPlayer('notCurrentFighter', 5);
            const combatState = mockCombatState();
            service['combatStates'][ACCESS_CODE] = combatState;
            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');
            service.attemptEscape(ACCESS_CODE, player);
            expect(resetCombatTimersSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(endCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should handle failed escape attempt', () => {
            const combatState = mockCombatState();
            combatState.currentFighter = combatState.attacker;
            service['combatStates'][ACCESS_CODE] = combatState;

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');

            jest.spyOn(global.Math, 'random').mockReturnValue(0.9);
            service.attemptEscape(ACCESS_CODE, combatState.attacker);

            expect(resetCombatTimersSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.escape.failed', {
                player: combatState.attacker,
                attemptsLeft: 1,
            });
            expect(combatState.remainingEscapeAttempts.get(combatState.attacker.name)).toBe(1);
            expect(endCombatTurnSpy).toHaveBeenCalledWith(ACCESS_CODE);
        });

        it('should handle successful escape attempt', () => {
            const combatState = mockCombatState();
            combatState.currentFighter = combatState.attacker;
            service['combatStates'][ACCESS_CODE] = combatState;

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const resetHealthSpy = jest.spyOn(service as any, 'resetHealth');
            const endCombatSpy = jest.spyOn(service, 'endCombat');

            jest.spyOn(global.Math, 'random').mockReturnValue(0.1);
            service.attemptEscape(ACCESS_CODE, combatState.attacker);

            expect(resetCombatTimersSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(combatState.remainingEscapeAttempts.get(combatState.attacker.name)).toBe(1);
            expect(resetHealthSpy).toHaveBeenCalledWith([combatState.attacker, combatState.defender], ACCESS_CODE);
            expect(combatState.hasEvaded).toBe(true);
            expect(endCombatSpy).toHaveBeenCalledWith(ACCESS_CODE, true);
        });
    });

    describe('checkPlayerWon', () => {
        it('should return true and end game session when player reaches win condition', () => {
            MOCK_PLAYER.combatWon = WIN_CONDITION;

            const endGameSessionSpy = jest.spyOn(gameSessionService, 'endGameSession');

            const result = service['checkPlayerWon'](ACCESS_CODE, MOCK_PLAYER);

            expect(result).toBe(true);
            expect(endGameSessionSpy).toHaveBeenCalledWith(ACCESS_CODE, MOCK_PLAYER.name);
        });
    });

    describe('endCombat', () => {
        it('should reset timers and emit event even if game session does not exist', () => {
            const combatState = mockCombatState();
            service['combatStates'][ACCESS_CODE] = combatState;

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');

            gameSessionService.getGameSession.mockReturnValue(null);

            service.endCombat(ACCESS_CODE);

            expect(resetCombatTimersSpy).toHaveBeenCalledWith(ACCESS_CODE);
            expect(emitEventSpy).toHaveBeenCalledWith(
                'game.combat.ended',
                expect.objectContaining({
                    attacker: combatState.attacker,
                    defender: combatState.defender,
                    currentFighter: combatState.currentFighter,
                    hasEvaded: combatState.hasEvaded,
                }),
            );
            expect(service['combatStates'][ACCESS_CODE]).toBeUndefined();
        });

        it('should resume game turn if current fighter is not the current player', () => {
            const combatState = mockCombatState();
            service['combatStates'][ACCESS_CODE] = combatState;

            gameSessionService.isCurrentPlayer.mockReturnValue(false);

            service.endCombat(ACCESS_CODE);

            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(ACCESS_CODE, false);
            expect(gameSessionService.endTurn).toHaveBeenCalledWith(ACCESS_CODE);
            expect(gameSessionService.resumeGameTurn).not.toHaveBeenCalled();
        });

        it('should end turn if current fighter is the current player', () => {
            const combatState = mockCombatState();
            service['combatStates'][ACCESS_CODE] = combatState;

            gameSessionService.isCurrentPlayer.mockReturnValue(true);

            service.endCombat(ACCESS_CODE);

            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(ACCESS_CODE, false);
            expect(gameSessionService.resumeGameTurn).toHaveBeenCalledWith(ACCESS_CODE, combatState.pausedGameTurnTimeRemaining);
            expect(gameSessionService.endTurn).not.toHaveBeenCalled();
        });

        it('should end combat immediately if a player has won', () => {
            const combatState = mockCombatState();
            combatState.currentFighter = mockPlayer('currentFighter', 5);
            service['combatStates'][ACCESS_CODE] = combatState;

            jest.spyOn(service, 'checkPlayerWon').mockReturnValue(true);
            const endCombatSpy = jest.spyOn(service, 'endCombat');

            service['handleCombatEnd'](combatState, mockPlayer('currentFighter', 5), ACCESS_CODE);

            expect(service.checkPlayerWon).toHaveBeenCalledWith(ACCESS_CODE, combatState.currentFighter);
            expect(endCombatSpy).toHaveBeenCalledWith(ACCESS_CODE);
        });

        it('should end turn if the defender was the attacker', () => {
            const combatState = mockCombatState();
            const defender = mockPlayer('currentFighter', 5);
            combatState.attacker = defender;
            service['combatStates'][ACCESS_CODE] = combatState;

            const endTurnSpy = jest.spyOn(gameSessionService, 'endTurn');

            service['handleCombatEnd'](combatState, defender, ACCESS_CODE);

            expect(endTurnSpy).toHaveBeenCalledWith(ACCESS_CODE);
        });
    });

    describe('isCombatActive', () => {
        it('should return false when combat state does not exist for the given access code', () => {
            service['combatStates'][ACCESS_CODE] = undefined;

            const result = service.isCombatActive(ACCESS_CODE);

            expect(result).toBe(false);
        });
    });

    describe('getCombatState', () => {
        it('should return null when combat state does not exist for the given access code', () => {
            service['combatStates'][ACCESS_CODE] = undefined;

            const result = service.getCombatState(ACCESS_CODE);

            expect(result).toBeNull();
        });
    });

    describe('startCombat', () => {
        it('should do nothing if defender is not found', () => {
            const defenderName = 'nonExistentDefender';

            gameSessionService.getPlayers.mockReturnValue([mockPlayer(ATTACKER_NAME, 6)]);

            const initialiseCombatStateSpy = jest.spyOn(service as any, 'initialiseCombatState');

            service.startCombat(ACCESS_CODE, ATTACKER_NAME, defenderName);

            expect(gameSessionService.pauseGameTurn).not.toHaveBeenCalled();
            expect(initialiseCombatStateSpy).not.toHaveBeenCalled();
        });

        it('should start combat in debug mode when specified', () => {
            const attacker = mockPlayer(ATTACKER_NAME, 6);
            const defender = mockPlayer(DEFENDER_NAME, 4);
            const pausedTimeRemaining = 30;
            const isDebugMode = true;

            gameSessionService.getPlayers.mockReturnValue([attacker, defender]);
            gameSessionService.pauseGameTurn.mockReturnValue(pausedTimeRemaining);
            combatHelper.determineCombatOrder.mockReturnValue([attacker, defender]);

            const initialiseCombatStateSpy = jest.spyOn(service as any, 'initialiseCombatState');

            service.startCombat(ACCESS_CODE, ATTACKER_NAME, DEFENDER_NAME, isDebugMode);

            expect(initialiseCombatStateSpy).toHaveBeenCalledWith(ACCESS_CODE, attacker, defender, pausedTimeRemaining, isDebugMode);
        });
    });

    describe('updateWinningPlayerAfterCombat', () => {
        it('should end game session when player has won', () => {
            const player = mockPlayer(PLAYER_NAME, 5);
            player.hp.current = 5;

            const mockPlayers = [player];
            gameSessionService.getPlayers.mockReturnValue(mockPlayers);

            const checkPlayerWonSpy = jest.spyOn(service as any, 'checkPlayerWon').mockReturnValue(true);

            service['updateWinningPlayerAfterCombat'](player, ACCESS_CODE);

            expect(checkPlayerWonSpy).toHaveBeenCalledWith(ACCESS_CODE, player);
            expect(gameSessionService.endGameSession).toHaveBeenCalledWith(ACCESS_CODE, player.name);
        });
    });

    describe('resetCombatTimers', () => {
        it('should clear timers when they exist', () => {
            const combatState = mockCombatState();

            const mockTimer = setTimeout(() => {
                return;
            }, 1000);
            const mockInterval = setInterval(() => {
                return;
            }, 1000);

            combatState.combatTurnTimers = mockTimer;
            combatState.combatCountdownInterval = mockInterval;

            service['combatStates'][ACCESS_CODE] = combatState;

            jest.spyOn(global, 'clearTimeout');
            jest.spyOn(global, 'clearInterval');

            (service as any).resetCombatTimers(ACCESS_CODE);

            expect(global.clearTimeout).toHaveBeenCalledWith(mockTimer);
            expect(global.clearInterval).toHaveBeenCalledWith(mockInterval);
            expect(combatState.combatTurnTimers).toBeNull();
            expect(combatState.combatCountdownInterval).toBeNull();
        });
    });

    describe('calculateAttackResult', () => {
        let combatState: CombatState;

        beforeEach(() => {
            combatState = mockCombatState();
            combatHelper.getRandomAttackScore.mockReturnValue(10);
            combatHelper.getRandomDefenseScore.mockReturnValue(8);
            // error here
            gameSessionService.getGameSession.mockReturnValue(mockGameSession);
        });

        it('should assign defender as defenderPlayer when currentFighter is attacker', () => {
            combatState.currentFighter = combatState.attacker;

            const result = service['calculateAttackResult'](combatState, ACCESS_CODE);

            expect(result.defenderPlayer).toBe(combatState.defender);
            expect(result.attackSuccessful).toBe(true);
        });

        it('should assign attacker as defenderPlayer when currentFighter is defender', () => {
            combatState.currentFighter = combatState.defender;

            const result = service['calculateAttackResult'](combatState, ACCESS_CODE);

            expect(result.defenderPlayer).toBe(combatState.attacker);
            expect(result.attackSuccessful).toBe(true);
        });
    });

    describe('handleSuccessfulAttack', () => {
        it('should decrease defender HP by attack damage', () => {
            const combatState = mockCombatState();
            const attackerScore = 8;
            const defenseScore = 3;
            const defenderPlayer = { ...mockPlayer(DEFENDER_NAME, 4), hp: { current: 10, max: 10 } };
            const expectedDamage = attackerScore - defenseScore;
            const expectedNewHp = defenderPlayer.hp.current - expectedDamage;

            (service as any).handleSuccessfulAttack(combatState, attackerScore, defenseScore, defenderPlayer, ACCESS_CODE);

            expect(defenderPlayer.hp.current).toBe(expectedNewHp);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player', { player: defenderPlayer });
        });
    });

    it('should perform attack automatically when timer expires and player did not perform action', () => {
        jest.useFakeTimers();
        const combatState = mockCombatState();
        combatState.playerPerformedAction = false;
        service['combatStates'] = { [ACCESS_CODE]: combatState };
        const performAttackSpy = jest.spyOn(service as any, 'performAttack').mockImplementation(() => {
            return;
        });
        (service as any).handleTimerTimeout(ACCESS_CODE, combatState, 1000);

        expect(performAttackSpy).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1000);
        expect(performAttackSpy).toHaveBeenCalledWith(ACCESS_CODE, combatState.currentFighter.name);
    });

    it('should initialize combat timer and emit events', () => {
        jest.useFakeTimers();
        const accessCode = ACCESS_CODE;
        const combatState = mockCombatState();
        const turnDurationInSeconds = 5;
        const mockDefender = mockPlayer(DEFENDER_NAME, 4);

        combatHelper.getDefender.mockReturnValue(mockDefender);

        const emitEventSpy = jest.spyOn(service as any, 'emitEvent').mockImplementation(() => {
            return;
        });

        (service as any).initializeCombatTimer(ACCESS_CODE, combatState, turnDurationInSeconds);
        expect(emitEventSpy).toHaveBeenCalledWith('game.combat.timer', {
            accessCode,
            attacker: combatState.currentFighter,
            defender: mockDefender,
            timeLeft: turnDurationInSeconds,
        });

        emitEventSpy.mockClear();
        jest.advanceTimersByTime(1000);
        expect(combatState.combatTurnTimeRemaining).toBe(turnDurationInSeconds - 1);
        expect(emitEventSpy).toHaveBeenCalledWith('game.combat.timer', {
            accessCode,
            attacker: combatState.currentFighter,
            defender: mockDefender,
            timeLeft: turnDurationInSeconds - 1,
        });
        emitEventSpy.mockClear();

        jest.advanceTimersByTime((turnDurationInSeconds - 1) * 1000);
        expect(combatState.combatCountdownInterval).toBeNull();
        expect(combatState.combatTurnTimeRemaining).toBe(0);
    });

    describe('attemptEscape', () => {
        it('should handle missing escape attempts entry by defaulting to 0', () => {
            const player = mockPlayer('missingPlayer', 5);
            const combatState = mockCombatState();

            combatState.remainingEscapeAttempts.delete(player.name);

            service['combatStates'][ACCESS_CODE] = combatState;
            combatState.currentFighter = player;

            const emitSpy = jest.spyOn(eventEmitter, 'emit');
            service.attemptEscape(ACCESS_CODE, player);

            expect(emitSpy).toHaveBeenCalledWith(
                'game.combat.escape.failed',
                expect.objectContaining({
                    attemptsLeft: -1,
                }),
            );

            expect(combatState.remainingEscapeAttempts.get(player.name)).toBe(-1);
        });
    });

    describe('getNextCombatFighter', () => {
        it('should return undefined when combatState does not exist', () => {
            service['combatStates'] = {};
            const result = service['getNextCombatFighter'](ACCESS_CODE);

            expect(result).toBeUndefined();
        });

        it('should return attacker when currentFighter is defender', () => {
            const mockState = mockCombatState();
            mockState.currentFighter = mockState.defender;
            service['combatStates'] = { [ACCESS_CODE]: mockState };
            const result = service['getNextCombatFighter'](ACCESS_CODE);

            expect(result).toBe(mockState.attacker);
        });
    });

    describe('startCombatTurn', () => {
        beforeEach(() => {
            service['calculateTurnDuration'] = jest.fn().mockReturnValue(5000);
            service['initializeCombatTimer'] = jest.fn();
            service['handleTimerTimeout'] = jest.fn();
            service['emitEvent'] = jest.fn();

            combatHelper.getDefender.mockReturnValue(mockPlayer(DEFENDER_NAME, 4));

            jest.useFakeTimers();
        });

        it('should return early when combatState does not exist', () => {
            const player = mockPlayer(PLAYER_NAME, 5);
            service['combatStates'] = {};

            service['startCombatTurn'](ACCESS_CODE, player);

            expect(service['emitEvent']).not.toHaveBeenCalled();
            expect(service['initializeCombatTimer']).not.toHaveBeenCalled();
            expect(service['handleTimerTimeout']).not.toHaveBeenCalled();
        });

        it('should clear existing combatCountdownInterval', () => {
            const player = mockPlayer(ATTACKER_NAME, 6);
            const mockState = mockCombatState();
            const intervalId = setInterval(() => {}, 1000);
            mockState.combatCountdownInterval = intervalId;
            service['combatStates'] = { [ACCESS_CODE]: mockState };

            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            service['startCombatTurn'](ACCESS_CODE, player);

            expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
            expect(mockState.combatCountdownInterval).toBeNull();
        });
    });
});
