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
});
