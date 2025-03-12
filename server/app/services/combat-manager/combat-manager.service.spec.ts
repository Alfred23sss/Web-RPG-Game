/* eslint-disable @typescript-eslint/no-explicit-any */
import { DiceType } from '@app/interfaces/Dice';
import { Player } from '@app/interfaces/Player';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { GameManagerService } from './combat-manager.service';

describe('GameManagerService', () => {
    let service: GameManagerService;
    let gameSessionService: jest.Mocked<GameSessionService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;
    let logger: jest.Mocked<Logger>;

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

    const mockCombatState = (accessCode: string) => ({
        attacker: mockPlayer('attacker', 6),
        defender: mockPlayer('defender', 4),
        currentFighter: mockPlayer('attacker', 4),
        remainingEscapeAttempts: new Map([
            ['attacker', 2],
            ['defender', 2],
        ]),
        combatTurnTimers: null,
        combatCountdownInterval: null,
        combatTurnTimeRemaining: 5,
        pausedGameTurnTimeRemaining: 30,
    });

    beforeEach(async () => {
        const mockGameSessionService = {
            setCombatState: jest.fn(),
            getPlayers: jest.fn(),
            pauseGameTurn: jest.fn(),
            resumeGameTurn: jest.fn(),
            endTurn: jest.fn(),
            isCurrentPlayer: jest.fn(),
        };

        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const mockLogger = {
            warn: jest.fn(),
            log: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameManagerService,
                { provide: GameSessionService, useValue: mockGameSessionService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: Logger, useValue: mockLogger },
            ],
        }).compile();

        service = module.get<GameManagerService>(GameManagerService);
        gameSessionService = module.get(GameSessionService);
        eventEmitter = module.get(EventEmitter2);
        logger = module.get(Logger);

        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('startCombat', () => {
        it('should initialize combat state and start first turn', () => {
            const players = [mockPlayer('attacker', 6), mockPlayer('defender', 4)];
            gameSessionService.getPlayers.mockReturnValue(players);
            gameSessionService.pauseGameTurn.mockReturnValue(30);

            service.startCombat('test', 'attacker', 'defender');

            expect(gameSessionService.setCombatState).toHaveBeenCalledWith('test', true);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'game.combat.started',
                expect.objectContaining({
                    accessCode: 'test',
                    attacker: players[0],
                    defender: players[1],
                }),
            );
        });

        it('should handle missing players', () => {
            gameSessionService.getPlayers.mockReturnValue([mockPlayer('attacker', 5)]);
            service.startCombat('test', 'attacker', 'defender');
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should clear existing interval when starting new combat turn', () => {
            const accessCode = 'test';
            const mockIntervalId = setInterval(() => {}, 1000);

            const combatState = {
                ...mockCombatState(accessCode),
                combatCountdownInterval: mockIntervalId,
            };
            (service as any).combatStates[accessCode] = combatState;

            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            (service as any).startCombatTurn(accessCode, combatState.currentFighter);

            expect(clearIntervalSpy).toHaveBeenCalledWith(mockIntervalId);

            expect(combatState.combatCountdownInterval).not.toBeNull();
            expect(combatState.combatCountdownInterval).not.toBe(mockIntervalId);
        });

        it('should order combatants with equal speed as attacker first', () => {
            const attacker = mockPlayer('attacker', 6);
            const defender = mockPlayer('defender', 6);

            const order = (service as any).determineCombatOrder(attacker, defender);

            expect(order[0].name).toBe('attacker');
            expect(order[1].name).toBe('defender');
        });
    });

    describe('endCombatTurn', () => {
        it('should transition to next fighter', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            service.endCombatTurn(accessCode);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'game.combat.turn.started',
                expect.objectContaining({ fighter: mockPlayer('defender', 4) }),
            );
        });
    });

    describe('performAttack', () => {
        it('should handle successful attack', () => {
            const accessCode = 'test';
            const combatState = mockCombatState(accessCode);
            (service as any).combatStates[accessCode] = combatState;

            jest.spyOn(Math, 'random').mockReturnValue(0.9);

            service.performAttack(accessCode, 'attacker');

            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.attack.result', expect.objectContaining({ success: true }));
            expect(service['combatStates'][accessCode]).toBeUndefined();
        });

        it('should handle invalid turn', () => {
            (service as any).combatStates['test'] = mockCombatState('test');
            service.performAttack('test', 'wrong-player');
            expect(logger.warn).toHaveBeenCalled();
        });
    });

    describe('attemptEscape', () => {
        it('should handle successful escape', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            jest.spyOn(Math, 'random').mockReturnValue(0.6);

            service.attemptEscape(accessCode, 'attacker');

            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.escape.result', expect.objectContaining({ success: true }));
        });

        it('should handle failed escape with attempts remaining', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            jest.spyOn(Math, 'random').mockReturnValue(0.4);

            service.attemptEscape(accessCode, 'attacker');

            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.escape.result', expect.objectContaining({ success: false }));
        });

        it('should handle failed escape without attempts', () => {
            const accessCode = 'test';
            const combatState = mockCombatState(accessCode);
            combatState.remainingEscapeAttempts.set('attacker', 0);
            combatState.currentFighter = mockPlayer('attacker', 4);

            (service as any).combatStates[accessCode] = combatState;

            service.attemptEscape(accessCode, 'attacker');

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'game.combat.escape.failed',
                expect.objectContaining({
                    player: combatState.currentFighter,
                    hasAttempts: false,
                }),
            );
        });
    });

    describe('endCombat', () => {
        it('should clean up combat state', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            service.endCombat(accessCode);

            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(accessCode, false);
            expect(service['combatStates'][accessCode]).toBeUndefined();
        });

        it('should handle escape scenario', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            service.endCombat(accessCode, true);

            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.ended', expect.objectContaining({ isEscape: true }));
        });
    });

    describe('helper methods', () => {
        it('should determine combat order by speed', () => {
            const attacker = mockPlayer('a', 6);
            const defender = mockPlayer('b', 4);

            const order = (service as any).determineCombatOrder(attacker, defender);
            expect(order[0].name).toBe('a');
        });

        it('should get next combat fighter', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            const next = (service as any).getNextCombatFighter(accessCode);
            expect(next.name).toBe('defender');
        });
    });

    describe('timer handling', () => {
        it('should handle combat timeout', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            service.endCombatTurn(accessCode, true);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.timeout', expect.anything());
        });

        it('should emit timer updates', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            (service as any).startCombatTurn(accessCode, mockPlayer('attacker', 6));
            jest.advanceTimersByTime(1000);

            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.timer', expect.objectContaining({ timeLeft: 4 }));
        });

        it('should automatically end combat turn when timer expires', () => {
            const accessCode = 'test';
            const combatState = {
                ...mockCombatState(accessCode),
                currentFighter: mockPlayer('attacker', 6),
            };

            (service as any).combatStates[accessCode] = combatState;
            const endCombatTurnSpy = jest.spyOn(service, 'endCombatTurn');

            (service as any).startCombatTurn(accessCode, combatState.currentFighter);

            expect(combatState.combatTurnTimers).toBeTruthy();

            jest.advanceTimersByTime(5000);

            expect(endCombatTurnSpy).toHaveBeenCalledWith(accessCode, true);
        });
    });

    describe('edge cases', () => {
        it('should return combat state', () => {
            const accessCode = 'test';
            (service as any).combatStates[accessCode] = mockCombatState(accessCode);

            expect(service.getCombatState(accessCode)).toBeTruthy();
        });

        it('should check combat active status', () => {
            expect(service.isCombatActive('test')).toBe(false);
            (service as any).combatStates['test'] = mockCombatState('test');
            expect(service.isCombatActive('test')).toBe(true);
        });
    });
});
