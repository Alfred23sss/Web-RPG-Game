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

    const mockCombatState = (accessCode: string) => ({
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
    });

    // Basic test to verify service creation
    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // Combat initialization tests
    describe('startCombat', () => {
        it('should initialize combat state with correct values', () => {
            const accessCode = 'test';
            const players = [mockPlayer('attacker', 6), mockPlayer('defender', 4)];
            gameSessionService.getPlayers.mockReturnValue(players);

            service.startCombat(accessCode, 'attacker', 'defender');

            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(accessCode, true);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                'game.combat.started',
                expect.objectContaining({
                    accessCode,
                    attacker: players[0],
                    defender: players[1],
                }),
            );
        });
    });

    // Attack handling tests
    describe('performAttack', () => {
        it('should handle successful attack reducing defender health', () => {
            const accessCode = 'test';
            const combatState = mockCombatState(accessCode);
            (service as any).combatStates[accessCode] = combatState;

            combatHelper.getRandomAttackScore.mockReturnValue(15);
            combatHelper.getRandomDefenseScore.mockReturnValue(10);

            service.performAttack(accessCode, 'attacker');

            expect(combatState.defender.hp.current).toBe(5);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.attack.result', expect.objectContaining({ attackSuccessful: true }));
        });
    });

    // Escape attempt tests
    describe('attemptEscape', () => {
        it('should handle successful escape', () => {
            const accessCode = 'test';
            const combatState = mockCombatState(accessCode);
            (service as any).combatStates[accessCode] = combatState;

            jest.spyOn(Math, 'random').mockReturnValue(0.2);
            service.attemptEscape(accessCode, combatState.currentFighter);

            expect(service['combatStates'][accessCode]).toBeUndefined();
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.ended', expect.anything());
        });
    });

    // Combat ending tests
    describe('endCombat', () => {
        it('should clean up state and resume game session', () => {
            const accessCode = 'test';
            const combatState = mockCombatState(accessCode);
            (service as any).combatStates[accessCode] = combatState;

            service.endCombat(accessCode);

            expect(service['combatStates'][accessCode]).toBeUndefined();
            expect(gameSessionService.setCombatState).toHaveBeenCalledWith(accessCode, false);
        });
    });

    // Timer handling tests
    describe('timer handling', () => {
        it('should handle combat turn timeout', () => {
            const accessCode = 'test';
            const combatState = mockCombatState(accessCode);
            (service as any).combatStates[accessCode] = combatState;

            jest.useFakeTimers();
            service.endCombatTurn(accessCode);
            jest.runAllTimers();

            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.turn.started', expect.anything());
        });
    });

    // Additional test cases for specific scenarios
    describe('additional scenarios', () => {
        it('should handle debug mode attacks', () => {
            const accessCode = 'test';
            const combatState = mockCombatState(accessCode);
            combatState.isDebugMode = true;
            (service as any).combatStates[accessCode] = combatState;

            combatHelper.getRandomAttackScore.mockReturnValue(20);
            combatHelper.getRandomDefenseScore.mockReturnValue(10);

            service.performAttack(accessCode, 'attacker');
            expect(combatState.defender.hp.current).toBe(0);
        });

        it('should handle exhausted escape attempts', () => {
            const accessCode = 'test';
            const combatState = mockCombatState(accessCode);
            combatState.remainingEscapeAttempts.set('attacker', 0);
            (service as any).combatStates[accessCode] = combatState;

            service.attemptEscape(accessCode, combatState.attacker);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.combat.escape.failed', expect.anything());
        });
    });
});
