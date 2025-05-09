/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
import { AttackScore } from '@common/interfaces/attack-score';
import { CombatState } from '@app/interfaces/combat-state';
import { DiceType } from '@app/interfaces/dice';
import { Player } from '@app/interfaces/player';
import { CombatHelperService } from '@app/services/combat-helper/combat-helper.service';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { ItemEffectsService } from '@app/services/item-effects/item-effects.service';
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
        isVirtual: false,
    });

    const mockCombatState = (): CombatState => ({
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
            beginnerPlayer: mockPlayer('beginnerPlayer', 5),
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
                        handlePlayerItemReset: jest.fn(),
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
                {
                    provide: ItemEffectsService,
                    useValue: {
                        isHealthConditionValid: jest.fn(),
                        removeEffects: jest.fn(),
                        addEffect: jest.fn(),
                    },
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
            const abandoningPlayerName = 'attacker';
            const combatState = mockCombatState();

            service['combatStates'][accessCode] = combatState;
            gameSessionService.getPlayers.mockReturnValue([combatState.attacker, combatState.defender]);

            const updateWinningPlayerAfterCombatSpy = jest.spyOn(service as any, 'updateWinningPlayerAfterCombat');

            service.handleCombatSessionAbandon(accessCode, abandoningPlayerName);

            expect(updateWinningPlayerAfterCombatSpy).toHaveBeenCalledWith(combatState.defender, accessCode);

            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player.list', {
                players: [combatState.attacker, combatState.defender],
                accessCode,
            });

            expect(service['combatStates'][accessCode]).toBeUndefined();
        });

        it('should return early if combatState does not exist', () => {
            const accessCode = 'noCombat';
            service['combatStates'][accessCode] = undefined;

            const getPlayersSpy = jest.spyOn(gameSessionService, 'getPlayers');

            service.handleCombatSessionAbandon(accessCode, 'anyPlayer');

            expect(getPlayersSpy).toHaveBeenCalledWith(accessCode);
            expect(gameSessionService.endTurn).not.toHaveBeenCalled();
        });
        it('should not end combat if both fighters are virtual but at least one human player remains', () => {
            const accessCode = 'virtualButHumansRemain';
            const combatState = mockCombatState();
            combatState.attacker.isVirtual = true;
            combatState.defender.isVirtual = true;

            service['combatStates'][accessCode] = combatState;

            const humanPlayer = mockPlayer('human', 5);
            gameSessionService.getPlayers.mockReturnValue([combatState.attacker, combatState.defender, humanPlayer]);

            const updateWinningPlayerAfterCombatSpy = jest.spyOn(service as any, 'updateWinningPlayerAfterCombat');
            const endCombatSpy = jest.spyOn(service, 'endCombat');

            service.handleCombatSessionAbandon(accessCode, 'notInCombat');

            expect(updateWinningPlayerAfterCombatSpy).not.toHaveBeenCalled();
            expect(endCombatSpy).not.toHaveBeenCalled();
        });

        it('should update winning player correctly when abandoning player is NOT the current fighter', () => {
            const accessCode = 'testAccessCode';
            const abandoningPlayerName = 'defender';

            const combatState = mockCombatState();
            combatState.currentFighter = combatState.attacker;

            service['combatStates'][accessCode] = combatState;

            gameSessionService.getPlayers.mockReturnValue([combatState.attacker, combatState.defender]);

            const updateWinningPlayerSpy = jest.spyOn(service as any, 'updateWinningPlayerAfterCombat');
            service.handleCombatSessionAbandon(accessCode, abandoningPlayerName);

            expect(updateWinningPlayerSpy).toHaveBeenCalledWith(combatState.attacker, accessCode);
            expect(service['combatStates'][accessCode]).toBeUndefined();
        });
    });

    describe('checkPlayerWon', () => {
        const WIN_CONDITION = 3;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return true and end game when player reaches win condition in non-CTF mode', () => {
            const accessCode = 'test-game';
            const winningPlayer = {
                ...mockPlayer('winner', 6),
                combatWon: WIN_CONDITION,
            };
            const mockPlayers = [winningPlayer, mockPlayer('other', 5)];

            gameSessionService.getGameSession.mockReturnValue({
                ...mockGameSession,
                game: {
                    ...mockGameSession.game,
                    mode: 'standard',
                },
            });
            gameSessionService.getPlayers.mockReturnValue(mockPlayers);

            const result = service.checkPlayerWon(accessCode, winningPlayer);

            expect(result).toBe(true);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player.list', {
                players: expect.any(Array),
                accessCode,
            });
        });
    });

    describe('endCombatTurn', () => {
        const accessCode = 'test-game';
        let combatState: CombatState;

        beforeEach(() => {
            combatState = {
                ...mockCombatState(),
                pausedGameTurnTimeRemaining: 30,
                currentFighter: mockPlayer('currentPlayer', 5),
            };
            service['combatStates'][accessCode] = combatState;
            gameSessionService.getGameSession.mockReturnValue(mockGameSession);
        });

        it('should resume game turn when not escape, currentFighter exists and is current player', () => {
            gameSessionService.isCurrentPlayer.mockReturnValue(true);

            service.endCombat(accessCode, false);
            expect(gameSessionService.resumeGameTurn).toHaveBeenCalledWith(accessCode, combatState.pausedGameTurnTimeRemaining);
            expect(gameSessionService.endTurn).not.toHaveBeenCalled();
        });

        it('should do nothing if game session does not exist', () => {
            gameSessionService.getGameSession.mockReturnValue(null);

            service.endCombat(accessCode, false);

            expect(gameSessionService.resumeGameTurn).not.toHaveBeenCalled();
            expect(gameSessionService.endTurn).not.toHaveBeenCalled();
            expect(gameSessionService.isCurrentPlayer).not.toHaveBeenCalled();
        });
        it('should do nothing if combat state does not exist', () => {
            service['combatStates'][accessCode] = undefined;

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const getNextCombatFighterSpy = jest.spyOn(service as any, 'getNextCombatFighter');
            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn' as any);

            service.endCombatTurn(accessCode);

            expect(resetCombatTimersSpy).not.toHaveBeenCalled();
            expect(getNextCombatFighterSpy).not.toHaveBeenCalled();
            expect(startCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should reset timers, get the next fighter, and start the next combat turn if combat state exists', () => {
            const nextFighter = mockPlayer('nextFighter', 5);

            service['combatStates'][accessCode] = combatState;

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const getNextCombatFighterSpy = jest.spyOn(service as any, 'getNextCombatFighter').mockReturnValue(nextFighter);
            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn' as any);

            service.endCombatTurn(accessCode);

            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(getNextCombatFighterSpy).toHaveBeenCalledWith(accessCode);
            expect(startCombatTurnSpy).toHaveBeenCalledWith(accessCode, nextFighter);
        });
    });

    describe('resetCombatTimers', () => {
        it('should clear timeout and set combatTurnTimers to null if it exists', () => {
            const accessCode = 'reset-test';
            const combatState = mockCombatState();

            const timeoutId = setTimeout(() => {}, 1000);
            combatState.combatTurnTimers = timeoutId;

            service['combatStates'][accessCode] = combatState;

            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            (service as any).resetCombatTimers(accessCode);

            expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
            expect(service['combatStates'][accessCode].combatTurnTimers).toBeNull();
        });

        describe('getCombatState', () => {
            const accessCode = 'test-access';

            it('should return combat state if it exists', () => {
                const mockState = mockCombatState();
                service['combatStates'][accessCode] = mockState;

                const result = service.getCombatState(accessCode);

                expect(result).toBe(mockState);
            });

            it('should return null if combat state does not exist', () => {
                service['combatStates'][accessCode] = undefined;

                const result = service.getCombatState(accessCode);

                expect(result).toBeNull();
            });
        });

        it('should not throw or call clearTimeout if combatTurnTimers is null', () => {
            const accessCode = 'reset-test-null';
            const combatState = mockCombatState();
            combatState.combatTurnTimers = null;

            service['combatStates'][accessCode] = combatState;

            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            (service as any).resetCombatTimers(accessCode);

            expect(clearTimeoutSpy).not.toHaveBeenCalled();
        });

        it('should clear interval and set combatCountdownInterval to null if it exists', () => {
            const accessCode = 'reset-test-interval';
            const combatState = mockCombatState();

            const intervalId = setInterval(() => {}, 1000);
            combatState.combatCountdownInterval = intervalId;

            service['combatStates'][accessCode] = combatState;

            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            (service as any).resetCombatTimers(accessCode);

            expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
            expect(combatState.combatCountdownInterval).toBeNull();
        });
    });

    describe('isCombatActive', () => {
        const accessCode = 'test-game';

        it('should return true when combat state exists for access code', () => {
            service['combatStates'][accessCode] = mockCombatState();
            const result = service.isCombatActive(accessCode);
            expect(result).toBe(true);
        });

        it('should return false when no combat state exists for access code', () => {
            service['combatStates'][accessCode] = undefined;

            const result = service.isCombatActive(accessCode);

            expect(result).toBe(false);
        });
    });

    describe('getCombatState', () => {
        const accessCode = 'test-game';
        const mockState = mockCombatState();

        it('should return CombatState when it exists for access code', () => {
            service['combatStates'][accessCode] = mockState;
            const result = service.getCombatState(accessCode);
            expect(result).toEqual(mockState);
            expect(result).not.toBeNull();
        });
    });

    describe('updateWinningPlayerAfterCombat', () => {
        const accessCode = 'test-game';
        let player: Player;

        beforeEach(() => {
            player = mockPlayer('winner', 6);
            gameSessionService.getPlayers.mockReturnValue([player]);
        });

        it('should end game session when player reaches win condition (3 wins)', () => {
            player.combatWon = 2;

            jest.spyOn(service, 'checkPlayerWon' as any).mockReturnValue(true);

            service['updateWinningPlayerAfterCombat'](player, accessCode);

            expect(player.combatWon).toBe(3);
            expect(gameSessionService.endGameSession).toHaveBeenCalledWith(accessCode, [player.name]);
            expect(gameSessionService.updateGameSessionPlayerList).toHaveBeenCalledWith(accessCode, player.name, player);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player', { player });
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player.list', {
                players: [player],
                accessCode,
            });
        });
    });

    describe('startCombat', () => {
        const accessCode = 'test-game';
        const attackerId = 'player1';
        const defenderId = 'player2';
        let attacker: Player;
        let defender: Player;

        beforeEach(() => {
            attacker = mockPlayer(attackerId, 5);
            defender = mockPlayer(defenderId, 4);

            gameSessionService.getPlayers.mockReturnValue([attacker, defender]);
            gameSessionService.pauseGameTurn.mockReturnValue(30);
            combatHelper.determineCombatOrder.mockReturnValue([attacker, defender]);
        });

        it('should call required services in correct order', () => {
            service.startCombat(accessCode, attackerId, defenderId);

            expect(gameSessionService.getPlayers).toHaveBeenCalledWith(accessCode);
            expect(gameSessionService.pauseGameTurn).toHaveBeenCalledWith(accessCode);
            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(accessCode, true);
            expect(combatHelper.determineCombatOrder).toHaveBeenCalledWith(attacker, defender);
        });

        it('should emit GameCombatStarted event with correct data', () => {
            service.startCombat(accessCode, attackerId, defenderId);

            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.started', {
                accessCode,
                attacker,
                defender,
                currentPlayerName: attackerId,
            });
        });

        it('should start first combat turn with first ordered fighter', () => {
            const startCombatTurnSpy = jest.spyOn(service as any, 'startCombatTurn');

            service.startCombat(accessCode, attackerId, defenderId);

            expect(startCombatTurnSpy).toHaveBeenCalledWith(accessCode, attacker);
        });

        it('should do nothing when attacker not found', () => {
            gameSessionService.getPlayers.mockReturnValue([defender]);

            service.startCombat(accessCode, attackerId, defenderId);

            expect(gameSessionService.pauseGameTurn).not.toHaveBeenCalled();
            expect(service['combatStates'][accessCode]).toBeUndefined();
        });

        it('should do nothing when defender not found', () => {
            gameSessionService.getPlayers.mockReturnValue([attacker]);

            service.startCombat(accessCode, attackerId, defenderId);

            expect(gameSessionService.pauseGameTurn).not.toHaveBeenCalled();
            expect(service['combatStates'][accessCode]).toBeUndefined();
        });

        it('should use default false for isDebugMode when not provided', () => {
            service.startCombat(accessCode, attackerId, defenderId);

            expect(service['combatStates'][accessCode].isDebugMode).toBe(false);
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

            const attackerScore: AttackScore = { score: 10, diceRolled: 2 };
            const defenseScore: AttackScore = { score: 5, diceRolled: 2 };

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const calculateAttackResultSpy = jest.spyOn(service as any, 'calculateAttackResult').mockReturnValue({
                attackSuccessful: true,
                attackerScore,
                defenseScore,
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
                    attackerScore,
                    defenseScore,
                    defenderPlayer,
                }),
            );

            expect(handleSuccessfulAttackSpy).toHaveBeenCalledWith(combatState, attackerScore, defenseScore, defenderPlayer, accessCode);
            expect(endCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should end combat turn when attack is unsuccessful', () => {
            const accessCode = 'testAccessCode';
            const attackerName = 'attacker';
            const combatState = mockCombatState();
            const defenderPlayer = mockPlayer('defender', 4);
            service['combatStates'][accessCode] = combatState;
            combatHelper.isValidAttacker.mockReturnValue(true);

            const attackerScore: AttackScore = { score: 5, diceRolled: 2 };
            const defenseScore: AttackScore = { score: 10, diceRolled: 2 };

            const resetCombatTimersSpy = jest.spyOn(service as any, 'resetCombatTimers');
            const calculateAttackResultSpy = jest.spyOn(service as any, 'calculateAttackResult').mockReturnValue({
                attackSuccessful: false,
                attackerScore,
                defenseScore,
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
                    attackerScore,
                    defenseScore,
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
            jest.spyOn(global.Math, 'random').mockReturnValue(1);
            service.attemptEscape(accessCode, player);
            expect(resetCombatTimersSpy).toHaveBeenCalledWith(accessCode);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'game.combat.escape',
                expect.objectContaining({
                    accessCode,
                    player: expect.any(Object),
                    attemptsLeft: expect.any(Number),
                    isEscapeSuccessful: expect.any(Boolean),
                }),
            );
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

        it('should handle missing escape attempts entry by defaulting to 0', () => {
            const accessCode = 'test';
            const player = mockPlayer('missingPlayer', 5);
            const combatState = mockCombatState();

            combatState.remainingEscapeAttempts.delete(player.name);

            service['combatStates'][accessCode] = combatState;
            combatState.currentFighter = player;

            jest.spyOn(global.Math, 'random').mockReturnValue(0.5);

            const emitSpy = jest.spyOn(eventEmitter, 'emit');
            service.attemptEscape(accessCode, player);

            expect(emitSpy).toHaveBeenCalledWith(
                'game.combat.escape',
                expect.objectContaining({
                    player: expect.any(Object),
                    accessCode,
                    attemptsLeft: -1,
                    isEscapeSuccessful: false,
                }),
            );

            expect(combatState.remainingEscapeAttempts.get(player.name)).toBe(-1);
        });
    });

    describe('calculateAttackResult', () => {
        it('should calculate successful attack result when attacker score is higher', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore: AttackScore = { score: 10, diceRolled: 2 };
            const defenseScore: AttackScore = { score: 5, diceRolled: 2 };

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

        it('should return undefined if game session is not available', () => {
            const accessCode = 'missing-session';
            const combatState = mockCombatState();

            gameSessionService.getGameSession.mockReturnValue(null);

            const result = (service as any).calculateAttackResult(combatState, accessCode);

            expect(result).toBeUndefined();
            expect(gameSessionService.getGameSession).toHaveBeenCalledWith(accessCode);
        });

        it('should calculate failed attack result when defender score is higher', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore: AttackScore = { score: 5, diceRolled: 2 };
            const defenseScore: AttackScore = { score: 10, diceRolled: 2 };

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

            combatHelper.getRandomAttackScore.mockReturnValue({ score: 10 } as any);
            combatHelper.getRandomDefenseScore.mockReturnValue({ score: 5 } as any);

            const result = (service as any).calculateAttackResult(combatState, accessCode);

            expect(result.defenderPlayer).toBe(combatState.attacker);
        });

        it('should handle debug mode correctly', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            combatState.isDebugMode = true;

            combatHelper.getRandomAttackScore.mockReturnValue({ score: 10 } as any);
            combatHelper.getRandomDefenseScore.mockReturnValue({ score: 5 } as any);

            (service as any).calculateAttackResult(combatState, accessCode);

            expect(combatHelper.getRandomAttackScore).toHaveBeenCalledWith(combatState.currentFighter, true, mockGameSession.game.grid);
            expect(combatHelper.getRandomDefenseScore).toHaveBeenCalledWith(combatState.attacker, true, mockGameSession.game.grid);
        });

        it('should assign defender as defenderPlayer when currentFighter is attacker', () => {
            const accessCode = 'test';
            const combatState = mockCombatState();
            combatState.currentFighter = combatState.attacker;
            combatHelper.getRandomAttackScore.mockReturnValue({ score: 10, diceRolled: 2 });
            combatHelper.getRandomDefenseScore.mockReturnValue({ score: 8, diceRolled: 2 });

            const result = service['calculateAttackResult'](combatState, accessCode);

            expect(result.defenderPlayer).toBe(combatState.defender);
            expect(result.attackSuccessful).toBe(true);
        });

        it('should assign attacker as defenderPlayer when currentFighter is defender', () => {
            const accessCode = 'test';
            const combatState = mockCombatState();
            combatState.currentFighter = combatState.defender;
            combatHelper.getRandomAttackScore.mockReturnValue({ score: 10, diceRolled: 2 });
            combatHelper.getRandomDefenseScore.mockReturnValue({ score: 8, diceRolled: 2 });

            const result = service['calculateAttackResult'](combatState, accessCode);

            expect(result.defenderPlayer).toBe(combatState.attacker);
            expect(result.attackSuccessful).toBe(true);
        });
    });

    describe('handleSuccessfulAttack', () => {
        it('should decrease defender HP by attack damage', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore: AttackScore = { score: 8, diceRolled: 2 };
            const defenseScore: AttackScore = { score: 3, diceRolled: 2 };
            const defenderPlayer = { ...mockPlayer('defender', 4), hp: { current: 10, max: 10 } };
            const expectedDamage = attackerScore.score - defenseScore.score;
            const expectedNewHp = defenderPlayer.hp.current - expectedDamage;

            (service as any).handleSuccessfulAttack(combatState, attackerScore, defenseScore, defenderPlayer, accessCode);

            expect(defenderPlayer.hp.current).toBe(expectedNewHp);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player', expect.objectContaining({ accessCode, player: defenderPlayer }));
        });

        it('should end combat when defender HP reaches zero', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore: AttackScore = { score: 15 } as any;
            const defenseScore: AttackScore = { score: 3 } as any;
            const defenderPlayer = { ...mockPlayer('defender', 4), hp: { current: 5, max: 10 } };

            const handleCombatEndSpy = jest.spyOn(service as any, 'handleCombatEnd').mockImplementation();

            (service as any).handleSuccessfulAttack(combatState, attackerScore, defenseScore, defenderPlayer, accessCode);

            expect(defenderPlayer.hp.current).toBe(0);
            expect(handleCombatEndSpy).toHaveBeenCalledWith(combatState, defenderPlayer, accessCode);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player', expect.objectContaining({ accessCode, player: defenderPlayer }));
        });

        it('should end combat turn when defender HP is greater than zero', () => {
            const accessCode = 'testAccessCode';
            const combatState = mockCombatState();
            const attackerScore: AttackScore = { score: 8 } as any;
            const defenseScore: AttackScore = { score: 3 } as any;
            const defenderPlayer = { ...mockPlayer('defender', 4), hp: { current: 10, max: 10 } };

            const endCombatTurnSpy = jest.spyOn(service as any, 'endCombatTurn').mockImplementation();

            (service as any).handleSuccessfulAttack(combatState, attackerScore, defenseScore, defenderPlayer, accessCode);

            expect(defenderPlayer.hp.current).toBe(5);
            expect(endCombatTurnSpy).toHaveBeenCalledWith(accessCode);
            expect(eventEmitter.emit).toHaveBeenCalledWith('update.player', expect.objectContaining({ accessCode, player: defenderPlayer }));
        });
    });

    it('should perform attack automatically when timer expires and player did not perform action', () => {
        jest.useFakeTimers();
        const accessCode = 'test';
        const combatState = mockCombatState();
        combatState.playerPerformedAction = false;
        service['combatStates'] = { [accessCode]: combatState };
        const performAttackSpy = jest.spyOn(service as any, 'performAttack').mockImplementation(() => {});
        (service as any).handleTimerTimeout(accessCode, combatState, 1000);

        expect(performAttackSpy).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1000);
        expect(performAttackSpy).toHaveBeenCalledWith(accessCode, combatState.currentFighter.name);
    });

    it('should not perform attack automatically when timer expires but player already performed action', () => {
        jest.useFakeTimers();
        const accessCode = 'test';
        const combatState = mockCombatState();
        combatState.playerPerformedAction = true;
        service['combatStates'] = { [accessCode]: combatState };
        const performAttackSpy = jest.spyOn(service as any, 'performAttack').mockImplementation(() => {});
        (service as any).handleTimerTimeout(accessCode, combatState, 1000);

        jest.advanceTimersByTime(1000);
        expect(performAttackSpy).not.toHaveBeenCalled();
    });

    describe('handleCombatEnd', () => {
        it('should end combat and return early if player wins', () => {
            const accessCode = 'test-code';
            const combatState = mockCombatState();
            const defenderPlayer = mockPlayer('defender', 5);

            service['combatStates'][accessCode] = combatState;

            const resetHealthSpy = jest.spyOn(service as any, 'resetHealth');
            const checkPlayerWonSpy = jest.spyOn(service, 'checkPlayerWon').mockReturnValue(true);

            (service as any).handleCombatEnd(combatState, defenderPlayer, accessCode);

            expect(resetHealthSpy).toHaveBeenCalledWith([combatState.currentFighter, defenderPlayer], accessCode);

            expect(checkPlayerWonSpy).toHaveBeenCalledWith(accessCode, combatState.currentFighter);
        });

        it('should call endTurn if defenderPlayer is attacker', () => {
            const accessCode = 'test-access';
            const combatState = mockCombatState();
            combatState.currentFighter = combatState.defender;
            const attackerAsDefender = combatState.attacker;

            service['combatStates'][accessCode] = combatState;

            jest.spyOn(service as any, 'resetHealth').mockImplementation(() => {});
            jest.spyOn(service, 'endCombat').mockImplementation(() => {});
            jest.spyOn(service, 'checkPlayerWon').mockReturnValue(false);
            jest.spyOn(combatHelper, 'resetLoserPlayerPosition').mockReturnValue([[]]);
            jest.spyOn(gameSessionService, 'emitGridUpdate').mockImplementation(() => {});
            const endTurnSpy = jest.spyOn(gameSessionService, 'endTurn');

            (service as any).handleCombatEnd(combatState, attackerAsDefender, accessCode);

            expect(endTurnSpy).toHaveBeenCalledWith(accessCode);
        });
    });

    it('should initialize combat timer and emit events', () => {
        jest.useFakeTimers();
        const accessCode = 'test';
        const combatState = mockCombatState();
        const turnDurationInSeconds = 5;
        const mockDefender = mockPlayer('defender', 4);

        combatHelper.getDefender.mockReturnValue(mockDefender);

        const emitEventSpy = jest.spyOn(service as any, 'emitEvent').mockImplementation(() => {});

        (service as any).initializeCombatTimer(accessCode, combatState, turnDurationInSeconds);
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

    describe('GameCombatService - Combat Turn Methods', () => {
        describe('getNextCombatFighter', () => {
            it('should return undefined when combatState does not exist', () => {
                const accessCode = 'nonexistent';
                service['combatStates'] = {};

                const result = service['getNextCombatFighter'](accessCode);

                expect(result).toBeUndefined();
            });

            it('should return defender when currentFighter is attacker', () => {
                const accessCode = 'test-code';
                const mockState = mockCombatState();
                mockState.currentFighter = mockState.attacker;
                service['combatStates'] = { [accessCode]: mockState };

                const result = service['getNextCombatFighter'](accessCode);

                expect(result).toBe(mockState.defender);
            });

            it('should return attacker when currentFighter is defender', () => {
                const accessCode = 'test-code';
                const mockState = mockCombatState();
                mockState.currentFighter = mockState.defender;
                service['combatStates'] = { [accessCode]: mockState };

                const result = service['getNextCombatFighter'](accessCode);

                expect(result).toBe(mockState.attacker);
            });
        });

        describe('startCombatTurn', () => {
            beforeEach(() => {
                service['calculateTurnDuration'] = jest.fn().mockReturnValue(5000);
                service['initializeCombatTimer'] = jest.fn();
                service['handleTimerTimeout'] = jest.fn();
                service['emitEvent'] = jest.fn();

                combatHelper.getDefender.mockReturnValue(mockPlayer('defender', 4));

                jest.useFakeTimers();
            });

            it('should return early when combatState does not exist', () => {
                const accessCode = 'nonexistent';
                const player = mockPlayer('player', 5);
                service['combatStates'] = {};

                service['startCombatTurn'](accessCode, player);

                expect(service['emitEvent']).not.toHaveBeenCalled();
                expect(service['initializeCombatTimer']).not.toHaveBeenCalled();
                expect(service['handleTimerTimeout']).not.toHaveBeenCalled();
            });

            it('should set up combat state correctly and emit event', () => {
                const accessCode = 'test-code';
                const player = mockPlayer('attacker', 6);
                const mockState = mockCombatState();
                service['combatStates'] = { [accessCode]: mockState };

                service['startCombatTurn'](accessCode, player);

                expect(mockState.playerPerformedAction).toBe(false);
                expect(mockState.currentFighter).toBe(player);
                expect(mockState.combatTurnTimeRemaining).toBe(5);
                expect(service['emitEvent']).toHaveBeenCalledWith('game.combat.turn.started', { accessCode, player, defender: expect.any(Object) });
            });

            it('should use default of 0 when player has no escape attempts remaining', () => {
                const accessCode = 'test-code';
                const player = mockPlayer('unknown', 5);
                const mockState = mockCombatState();
                service['combatStates'] = { [accessCode]: mockState };

                service['startCombatTurn'](accessCode, player);

                expect(service['calculateTurnDuration']).toHaveBeenCalledWith(0);
            });

            it('should clear existing combatCountdownInterval', () => {
                const accessCode = 'test-code';
                const player = mockPlayer('attacker', 6);
                const mockState = mockCombatState();
                const intervalId = setInterval(() => {}, 1000);
                mockState.combatCountdownInterval = intervalId;
                service['combatStates'][accessCode] = mockState;

                const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
                service['startCombatTurn'](accessCode, player);

                expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
                expect(mockState.combatCountdownInterval).toBeNull();
            });

            it('should not attempt to clear interval when combatCountdownInterval is null', () => {
                const accessCode = 'test-code';
                const player = mockPlayer('attacker', 6);
                const mockState = mockCombatState();
                mockState.combatCountdownInterval = null;
                service['combatStates'] = { [accessCode]: mockState };

                const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

                service['startCombatTurn'](accessCode, player);

                expect(clearIntervalSpy).not.toHaveBeenCalled();
            });

            it('should call initializeCombatTimer and handleTimerTimeout with correct parameters', () => {
                const accessCode = 'test-code';
                const player = mockPlayer('attacker', 6);
                const mockState = mockCombatState();
                service['combatStates'] = { [accessCode]: mockState };

                service['startCombatTurn'](accessCode, player);

                expect(service['initializeCombatTimer']).toHaveBeenCalledWith(accessCode, mockState, 5);
                expect(service['handleTimerTimeout']).toHaveBeenCalledWith(accessCode, mockState, 5000);
            });
        });
    });
});
