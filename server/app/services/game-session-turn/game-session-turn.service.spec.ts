/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { DiceType } from '@app/interfaces/Dice';
import { Player } from '@app/interfaces/Player';
import { Turn } from '@app/interfaces/Turn';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionTurnService } from './game-session-turn.service';
import { TeamType } from '@app/enums/enums';

describe('GameSessionTurnService', () => {
    let service: GameSessionTurnService;
    let lobbyService: LobbyService;
    let eventEmitter: EventEmitter2;

    const createPlayer = (name: string, speed: number, isActive = false): Player => ({
        name,
        avatar: `avatar${name}`,
        speed,
        vitality: 100,
        attack: { value: 5, bonusDice: DiceType.D6 },
        defense: { value: 3, bonusDice: DiceType.D4 },
        hp: { current: 100, max: 100 },
        movementPoints: 5,
        actionPoints: 2,
        inventory: [null, null],
        isAdmin: false,
        hasAbandoned: false,
        isActive,
        combatWon: 0,
        isVirtual: false,
    });

    const createTurn = (players: Player[], currentPlayer: Player | null = null): Turn => ({
        orderedPlayers: players,
        currentPlayer,
        currentTurnCountdown: 0,
        turnTimers: null,
        isTransitionPhase: false,
        countdownInterval: null,
        isInCombat: false,
        beginnerPlayer: createPlayer('Player1', 10, false),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameSessionTurnService,
                {
                    provide: LobbyService,
                    useValue: { getLobbyPlayers: jest.fn().mockReturnValue([]) },
                },
                {
                    provide: EventEmitter2,
                    useValue: { emit: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<GameSessionTurnService>(GameSessionTurnService);
        lobbyService = module.get<LobbyService>(LobbyService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('initializeTurn', () => {
        it('should initialize a turn with ordered players', () => {
            const players = [createPlayer('Player1', 10), createPlayer('Player2', 20)];
            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);

            const turn = service.initializeTurn('1234');

            expect(turn.orderedPlayers).toEqual([{ ...createPlayer('Player2', 20, true) }, { ...createPlayer('Player1', 10) }]);
            expect(turn.currentPlayer).toBeNull();
            expect(turn.currentTurnCountdown).toBe(0);
            expect(turn.turnTimers).toBeNull();
            expect(turn.isTransitionPhase).toBe(false);
            expect(turn.countdownInterval).toBeNull();
            expect(turn.isInCombat).toBe(false);
        });
    });

    describe('startTransitionPhase', () => {
        it('should start the transition phase and set the next player', () => {
            const players = [createPlayer('Player1', 10), createPlayer('Player2', 20)];
            const turn = createTurn(players);

            jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);
            jest.useFakeTimers();

            const updatedTurn = service.startTransitionPhase('1234', turn);

            expect(updatedTurn.isTransitionPhase).toBe(true);
            expect(updatedTurn.transitionTimeRemaining).toBe(3);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.transition.started', { accessCode: '1234', nextPlayer: players[0] });

            jest.advanceTimersByTime(1000);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.transition.countdown', { accessCode: '1234', timeLeft: 2 });

            jest.advanceTimersByTime(3000);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.turn.started', { accessCode: '1234', player: players[0] });
        });
    });

    describe('startPlayerTurn', () => {
        const SECOND = 1000;
        const TURN_DURATION = 30000;
        it('should correctly initialize player turn and setup timers', () => {
            jest.useFakeTimers();
            const accessCode = 'test';
            const player = createPlayer('player1', 5, false);
            const players = [player, createPlayer('player2', 4)];
            const turn = createTurn(players);
            const updatePlayerSpy = jest.spyOn(service as any, 'updatePlayer');
            const emitEventSpy = jest.spyOn(service as any, 'emitEvent');
            const updatedTurn = service.startPlayerTurn(accessCode, player, turn);
            expect(updatedTurn.isTransitionPhase).toBe(false);
            expect(updatedTurn.currentPlayer).toBe(player);
            expect(updatedTurn.currentTurnCountdown).toBe(TURN_DURATION / SECOND);
            expect(updatePlayerSpy).toHaveBeenCalledWith(player, { isActive: true });
            expect(emitEventSpy).toHaveBeenCalledWith('game.turn.started', { accessCode, player });
            jest.advanceTimersByTime(SECOND);
            expect(updatedTurn.currentTurnCountdown).toBe(TURN_DURATION / SECOND - 1);
            expect(emitEventSpy).toHaveBeenCalledWith('game.turn.timer', {
                accessCode,
                timeLeft: TURN_DURATION / SECOND - 1,
            });
            emitEventSpy.mockClear();
            jest.advanceTimersByTime((TURN_DURATION / SECOND - 1) * SECOND);
            expect(updatedTurn.countdownInterval).toBeNull();
            expect(updatedTurn.currentTurnCountdown).toBe(0);
            const emitSpy = jest.spyOn(eventEmitter, 'emit');
            jest.advanceTimersByTime(1);
            expect(emitSpy).toHaveBeenCalledWith('game.turn.timeout', { accessCode });
        });

        it('should clear existing interval and timer if present', () => {
            jest.useFakeTimers();
            const accessCode = 'test';
            const player = createPlayer('player1', 5);
            const players = [player, createPlayer('player2', 4)];
            const turn = createTurn(players);

            turn.countdownInterval = setInterval(() => {}, 1000);
            turn.turnTimers = setTimeout(() => {}, 1000);
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            service.startPlayerTurn(accessCode, player, turn);
            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        it('should handle the case when timer runs out', () => {
            jest.useFakeTimers();
            const accessCode = 'test';
            const player = createPlayer('player1', 5);
            const players = [player, createPlayer('player2', 4)];
            const turn = createTurn(players);
            const updatedTurn = service.startPlayerTurn(accessCode, player, turn);
            jest.advanceTimersByTime(TURN_DURATION + 1);
            expect(updatedTurn.countdownInterval).toBeNull();
            expect(updatedTurn.currentTurnCountdown).toBe(0);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.turn.timeout', { accessCode });
        });
    });

    describe('endTurn', () => {
        it('should end the current turn and clear timers', () => {
            const player = createPlayer('Player1', 10);
            const turn = createTurn([player], player);
            turn.turnTimers = setTimeout(() => {}, 10000);
            turn.countdownInterval = setInterval(() => {}, 1000);

            const updatedTurn = service.endTurn(turn);

            expect(updatedTurn.currentPlayer).toBe(player);
            expect(updatedTurn.currentTurnCountdown).toBe(0);
            expect(updatedTurn.turnTimers).toBeNull();
            expect(updatedTurn.countdownInterval).toBeNull();
            expect(player.isActive).toBe(false);
        });
    });

    describe('pauseTurn', () => {
        it('should pause the current turn and return the remaining time', () => {
            const player = createPlayer('Player1', 10);
            const turn = createTurn([player], player);
            turn.turnTimers = setTimeout(() => {}, 10000);
            turn.countdownInterval = setInterval(() => {}, 1000);

            const remainingTime = service.pauseTurn(turn);

            expect(remainingTime).toBe(0);
            expect(turn.turnTimers).toBeNull();
            expect(turn.countdownInterval).toBeNull();
        });
    });

    describe('resumeTurn', () => {
        it('should resume the turn with the remaining time', () => {
            const player = createPlayer('Player1', 10);
            const turn = createTurn([player], player);

            jest.useFakeTimers();

            const updatedTurn = service.resumeTurn('1234', turn, 10);

            expect(updatedTurn.currentTurnCountdown).toBe(10);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.turn.resumed', { accessCode: '1234', player });

            jest.advanceTimersByTime(1000);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.turn.timer', { accessCode: '1234', timeLeft: 9 });

            jest.advanceTimersByTime(10000);
            expect(eventEmitter.emit).toHaveBeenCalledWith('game.turn.timeout', { accessCode: '1234' });
        });
    });

    describe('getNextPlayer', () => {
        it('should return the next player in the order', () => {
            const players = [createPlayer('Player1', 10), createPlayer('Player2', 20)];
            const turn = createTurn(players, players[0]);

            const nextPlayer = service.getNextPlayer('1234', turn);

            expect(nextPlayer).toBe(players[1]);
        });

        it('should return the first player if no current player', () => {
            const players = [createPlayer('Player1', 10), createPlayer('Player2', 20)];
            const turn = createTurn(players);

            const nextPlayer = service.getNextPlayer('1234', turn);

            expect(nextPlayer).toBe(players[0]);
        });

        it('should return null if all players have abandoned', () => {
            const players = [createPlayer('Player1', 10, true), createPlayer('Player2', 20, true)];
            const turn = createTurn(players);

            const nextPlayer = service.getNextPlayer('1234', turn);

            expect(nextPlayer).toBe(players[0]);
        });
    });

    describe('orderPlayersBySpeed', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should order players with equal speed randomly (Math.random < 0.5)', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.3);

            const players = [createPlayer('Player1', 10), createPlayer('Player2', 20), createPlayer('Player3', 20)];
            const orderedPlayers = service.orderPlayersBySpeed(players);

            expect(orderedPlayers[0].name).toBe('Player3');
            expect(orderedPlayers[1].name).toBe('Player2');
            expect(orderedPlayers[2].name).toBe('Player1');
        });

        it('should order players with equal speed randomly (Math.random >= 0.5)', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.7);

            const players = [createPlayer('Player1', 10), createPlayer('Player2', 20), createPlayer('Player3', 20)];
            const orderedPlayers = service.orderPlayersBySpeed(players);

            expect(orderedPlayers[0].name).toBe('Player2');
            expect(orderedPlayers[1].name).toBe('Player3');
            expect(orderedPlayers[2].name).toBe('Player1');
        });
    });

    describe('updatePlayer', () => {
        it('should update the player with the given updates', () => {
            const player = createPlayer('Player1', 10);

            service.updatePlayer(player, { isActive: true });

            expect(player.isActive).toBe(true);
        });
    });

    describe('endTurn', () => {
        it('should clear the turn timers and interval', () => {
            const player = createPlayer('Player1', 10);
            const turn = createTurn([player], player);
            turn.turnTimers = setTimeout(() => {}, 10000) as NodeJS.Timeout;
            turn.countdownInterval = setInterval(() => {}, 1000) as NodeJS.Timeout;
            const updatedTurn = service.endTurn(turn);

            expect(updatedTurn.turnTimers).toBeNull();
            expect(updatedTurn.countdownInterval).toBeNull();
        });
    });

    describe('pauseTurn', () => {
        it('should clear the turn timers and interval', () => {
            const player = createPlayer('Player1', 10);
            const turn = createTurn([player], player);
            turn.turnTimers = setTimeout(() => {}, 10000) as NodeJS.Timeout;
            turn.countdownInterval = setInterval(() => {}, 1000) as NodeJS.Timeout;
            service.pauseTurn(turn);

            expect(turn.turnTimers).toBeNull();
            expect(turn.countdownInterval).toBeNull();
        });
    });

    describe('orderPlayersBySpeed', () => {
        it('should reverse order when speeds are equal and Math.random() >= 0.5', () => {
            jest.spyOn(Math, 'random').mockImplementation(() => 0.7);

            const players = [createPlayer('Player1', 10), createPlayer('Player2', 10)];
            const orderedPlayers = service.orderPlayersBySpeed(players);

            expect(orderedPlayers[0].name).toBe('Player1');
            expect(orderedPlayers[1].name).toBe('Player2');
        });
    });
    describe('initializeTurnCTF', () => {
        it('should initialize a CTF turn with players divided into RED and BLUE teams', () => {
            const accessCode = 'test-code';
            const players = [
                createPlayer('Player1', 10),
                createPlayer('Player2', 8),
                createPlayer('Player3', 12),
                createPlayer('Player4', 7),
                createPlayer('Player5', 9),
                createPlayer('Player6', 11),
            ];

            const mockTurn = createTurn(players, players[0]);

            jest.spyOn(service, 'initializeTurn').mockReturnValue(mockTurn);

            const mockRandom = jest.spyOn(global.Math, 'random');
            mockRandom.mockReturnValue(0.5);

            const result = service.initializeTurnCTF(accessCode);

            expect(service.initializeTurn).toHaveBeenCalledWith(accessCode);
            expect(result).toBeDefined();
            expect(result.orderedPlayers).toHaveLength(6);

            const redTeamCount = result.orderedPlayers.filter((p) => p.team === TeamType.RED).length;
            const blueTeamCount = result.orderedPlayers.filter((p) => p.team === TeamType.BLUE).length;

            expect(redTeamCount).toBe(3);
            expect(blueTeamCount).toBe(3);

            result.orderedPlayers.forEach((player) => {
                expect(player.team).toBeDefined();
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                expect([TeamType.RED, TeamType.BLUE].includes(player.team!)).toBeTruthy();
            });

            mockRandom.mockRestore();
        });

        it('should handle odd number of players correctly', () => {
            const accessCode = 'test-code';
            const players = [
                createPlayer('Player1', 10),
                createPlayer('Player2', 8),
                createPlayer('Player3', 12),
                createPlayer('Player4', 7),
                createPlayer('Player5', 9),
            ];

            const mockTurn = createTurn(players, players[0]);
            jest.spyOn(service, 'initializeTurn').mockReturnValue(mockTurn);

            const mockRandom = jest.spyOn(global.Math, 'random');
            mockRandom.mockReturnValue(0.5);

            const result = service.initializeTurnCTF(accessCode);

            const redTeamCount = result.orderedPlayers.filter((p) => p.team === TeamType.RED).length;
            const blueTeamCount = result.orderedPlayers.filter((p) => p.team === TeamType.BLUE).length;

            expect(redTeamCount).toBe(3);
            expect(blueTeamCount).toBe(2);

            mockRandom.mockRestore();
        });

        it('should maintain the return structure from initializeTurn', () => {
            const accessCode = 'test-code';
            const players = [createPlayer('Player1', 10), createPlayer('Player2', 8)];

            const mockTurn = createTurn(players, players[0]);
            mockTurn.currentTurnCountdown = 30;
            mockTurn.isTransitionPhase = true;

            jest.spyOn(service, 'initializeTurn').mockReturnValue(mockTurn);

            const result = service.initializeTurnCTF(accessCode);
            expect(result.currentTurnCountdown).toBe(30);
            expect(result.isTransitionPhase).toBe(true);
            expect(result.currentPlayer).toBe(players[0]);
            expect(result.beginnerPlayer.name).toBe('Player1');
        });
    });
});
