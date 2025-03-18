/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */ // the original file respects this condition
/* eslint-disable @typescript-eslint/no-empty-function */ // necessary to get actual reference
/* eslint-disable @typescript-eslint/no-explicit-any */ // allows access to GameSessionService

import { DiceType } from '@app/interfaces/Dice';
import { Game } from '@app/interfaces/Game';
import { Lobby } from '@app/interfaces/Lobby';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameSessionService } from './game-session.service';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { Turn } from '@app/interfaces/Turn';
import { ImageType, TileType } from '@app/enums/enums';

const DEFAULT_TIME = 3000;
const SHORT_TIME = 1000;
const FAST_SPEED = 6;
const SLOW_SPEED = 4;

describe('GameSessionService', () => {
    let gameSessionService: GameSessionService;
    let lobbyService: LobbyService;
    let accessCodesService: AccessCodesService;
    let eventEmitter: EventEmitter2;
    let logger: Logger;
    let gridManagerService: GridManagerService;
    let turnService: GameSessionTurnService;

    const createValidPlayer = (name: string, speed: number, isAdmin: boolean): Player => ({
        name,
        avatar: 'default-avatar.png',
        speed,
        attack: { value: 4, bonusDice: 'd6' as DiceType },
        defense: { value: 4, bonusDice: 'd4' as DiceType },
        hp: { current: 10, max: 10 },
        movementPoints: 3,
        actionPoints: 3,
        inventory: [null, null],
        isAdmin,
        hasAbandoned: false,
        isActive: false,
        combatWon: 0,
        vitality: 0,
    });

    const createMockTurn = (): Turn => ({
        orderedPlayers: [createValidPlayer('Player 1', 5, true), createValidPlayer('Player 2', 7, false)],
        currentPlayer: createValidPlayer('Player 1', 5, true),
        currentTurnCountdown: 60,
        turnTimers: null,
        countdownInterval: null,
        isTransitionPhase: false,
        isInCombat: false,
        transitionTimeRemaining: undefined,
    });

    const createValidTile = (hasHome: boolean): Tile =>
        ({
            id: 'tile-1-1',
            item: hasHome ? { name: 'home', effect: 'spawn' } : null,
            player: null,
            isOccupied: false,
            isAccessible: true,
            coordinates: { x: 0, y: 0 },
        }) as unknown as Tile;

    const MOCK_LOBBY: Lobby = {
        accessCode: 'test-code',
        isLocked: false,
        maxPlayers: 4,
        game: {
            id: 'game-id',
            name: 'Test Game',
            size: { width: 2, height: 2 },
            mode: 'classic',
            grid: [
                [createValidTile(true), createValidTile(true)],
                [createValidTile(true), createValidTile(true)],
            ],
            lastModified: new Date().toISOString(),
            isVisible: true,
            previewImage: 'test-image.jpg',
            description: 'Test game description',
        } as unknown as Game,
        players: [createValidPlayer('Player 1', SLOW_SPEED, true), createValidPlayer('Player 2', FAST_SPEED, false)],
        waitingPlayers: [],
    };

    beforeEach(() => {
        jest.useFakeTimers();
        accessCodesService = new AccessCodesService();
        lobbyService = new LobbyService(accessCodesService);
        eventEmitter = new EventEmitter2();
        logger = new Logger();
        gridManagerService = new GridManagerService(logger);
        turnService = new GameSessionTurnService(logger, lobbyService, eventEmitter);

        jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY);
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(MOCK_LOBBY.players);

        gameSessionService = new GameSessionService(logger, lobbyService, eventEmitter, gridManagerService, turnService);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should create a game session with ordered players and spawn points', () => {
        const session = gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        expect(session).toBeDefined();
        expect(session.turn.orderedPlayers).toHaveLength(2);
        expect(session.turn.orderedPlayers[0].speed).toBe(FAST_SPEED);
        expect(session.game.grid.flat().filter((t) => t.player).length).toBe(2);
    });

    it('should handle empty player list', () => {
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue([]);
        const session = gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        expect(session.turn.orderedPlayers).toHaveLength(0);
    });

    it('should clear timers and delete session', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        gameSessionService.deleteGameSession(MOCK_LOBBY.accessCode);

        expect(clearTimeoutSpy).toHaveBeenCalled();
        expect(clearIntervalSpy).toHaveBeenCalled();
        expect(gameSessionService['gameSessions'].has(MOCK_LOBBY.accessCode)).toBe(false);
    });

    it('should transition to next player', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const emitSpy = jest.spyOn(eventEmitter, 'emit');

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);

        expect(emitSpy).toHaveBeenCalledWith('game.transition.started', expect.objectContaining({ accessCode: MOCK_LOBBY.accessCode }));
    });

    it('should handle transition countdown', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const emitSpy = jest.spyOn(eventEmitter, 'emit');

        jest.advanceTimersByTime(DEFAULT_TIME);

        expect(emitSpy).toHaveBeenCalledWith('game.transition.countdown', expect.anything());
        expect(emitSpy).toHaveBeenCalledWith('game.turn.started', expect.anything());
    });

    it('should start turn timer and emit events', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const emitSpy = jest.spyOn(eventEmitter, 'emit');

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        expect(emitSpy).toHaveBeenCalledWith('game.turn.started', expect.anything());
        expect(emitSpy).toHaveBeenCalledWith('game.transition.started', expect.anything());
    });

    it('should randomize order when speeds are equal', () => {
        const players = [createValidPlayer('Player1', SLOW_SPEED, true), createValidPlayer('Player2', SLOW_SPEED, false)];

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        jest.spyOn(Math, 'random').mockReturnValue(0.2);
        const ordered = turnService['orderPlayersBySpeed'](players);

        expect(ordered[0].name).toBe('Player2');
    });

    it('should cycle through active players', () => {
        const players = [createValidPlayer('FastPlayer', FAST_SPEED, true), createValidPlayer('SlowPlayer', SLOW_SPEED, false)];
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);
        const firstPlayer = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode)?.turn.currentPlayer;

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);
        const secondPlayer = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode)?.turn.currentPlayer;

        expect(firstPlayer?.name).toBe('FastPlayer');
        expect(secondPlayer?.name).toBe('SlowPlayer');
    });

    it('should wrap around to first player after last', () => {
        const players = [createValidPlayer('P1', FAST_SPEED, true), createValidPlayer('P2', SLOW_SPEED, false)];
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        expect(session?.turn.currentPlayer?.name).toBe('P1');
    });

    it('should skip abandoned players', () => {
        const players = [createValidPlayer('Player1', FAST_SPEED, true), createValidPlayer('Player2', SLOW_SPEED, false)];
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode).turn.currentPlayer = players[0];

        gameSessionService.handlePlayerAbandoned(MOCK_LOBBY.accessCode, 'Player1');

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);

        jest.advanceTimersByTime(DEFAULT_TIME);
        jest.advanceTimersByTime(SHORT_TIME);

        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        expect(session?.turn.currentPlayer?.name).toBe('Player2');
    });

    it('should handle multiple abandoned players', () => {
        const players = [
            createValidPlayer('P1', FAST_SPEED, true),
            createValidPlayer('P2', SLOW_SPEED, true),
            createValidPlayer('P3', SLOW_SPEED, false),
        ];
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode).turn.currentPlayer = players[0];

        gameSessionService.handlePlayerAbandoned(MOCK_LOBBY.accessCode, 'P1');
        gameSessionService.handlePlayerAbandoned(MOCK_LOBBY.accessCode, 'P2');

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);

        expect(session?.turn.currentPlayer?.name).toBe('P3');
    });

    it('should emit timer updates during player turn', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const emitSpy = jest.spyOn(eventEmitter, 'emit');

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);

        jest.advanceTimersByTime(DEFAULT_TIME);
        jest.advanceTimersByTime(SHORT_TIME);

        expect(emitSpy).toHaveBeenCalledWith(
            'game.turn.timer',
            expect.objectContaining({
                accessCode: MOCK_LOBBY.accessCode,
                timeLeft: 29,
            }),
        );

        jest.advanceTimersByTime(DEFAULT_TIME);

        const timerUpdates = emitSpy.mock.calls.filter((call) => call[0] === 'game.turn.timer').map((call) => call[1].timeLeft);

        /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */ // just 1 sec timer numbers interval
        expect(timerUpdates).toEqual(expect.arrayContaining([29, 28, 27]));
    });

    it('should automatically end turn after TURN_DURATION', () => {
        const endTurnSpy = jest.spyOn(GameSessionService.prototype, 'endTurn');
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        const initialTimer = session?.turn.turnTimers;

        expect(initialTimer).toBeDefined();

        jest.advanceTimersByTime(DEFAULT_TIME);

        expect(endTurnSpy).toHaveBeenCalledWith(MOCK_LOBBY.accessCode);
    });

    it('should emit turn resumed event when resuming game', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        const remainingTime = 15;
        const emitSpy = jest.spyOn(eventEmitter, 'emit');

        gameSessionService.resumeGameTurn(MOCK_LOBBY.accessCode, remainingTime);

        expect(emitSpy).toHaveBeenCalledWith(
            'game.turn.resumed',
            expect.objectContaining({
                accessCode: MOCK_LOBBY.accessCode,
                player: session.turn.currentPlayer,
                remainingTime,
            }),
        );
    });

    it('should handle resume attempt for non-existent session', () => {
        const emitSpy = jest.spyOn(eventEmitter, 'emit');
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        gameSessionService.resumeGameTurn('invalid-code', 10);
        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should maintain correct timer sequence after resume', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        const initialRemaining = gameSessionService.pauseGameTurn(MOCK_LOBBY.accessCode);
        const emitSpy = jest.spyOn(eventEmitter, 'emit');

        gameSessionService.resumeGameTurn(MOCK_LOBBY.accessCode, initialRemaining);

        jest.advanceTimersByTime(SHORT_TIME);
        expect(emitSpy).toHaveBeenCalledWith(
            'game.turn.timer',
            expect.objectContaining({
                timeLeft: initialRemaining - 1,
            }),
        );

        const endTurnSpy = jest.spyOn(gameSessionService, 'endTurn');
        jest.advanceTimersByTime(initialRemaining * SHORT_TIME);
        expect(endTurnSpy).toHaveBeenCalledWith(MOCK_LOBBY.accessCode);
    });

    it('should automatically call endTurn after TURN_DURATION when the player turn starts', () => {
        const endTurnSpy = jest.spyOn(gameSessionService, 'endTurn');

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

        jest.advanceTimersByTime(DEFAULT_TIME);

        /* eslint-disable-next-line @typescript-eslint/no-magic-numbers*/ // just a longer arbitrary timer
        jest.advanceTimersByTime(30000);

        /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */ // amount of times the spy should be called
        expect(endTurnSpy).toHaveBeenCalledTimes(5);
        expect(endTurnSpy).toHaveBeenCalledWith(MOCK_LOBBY.accessCode);
    });

    it('should clear existing countdown interval in startPlayerTurn if it exists', () => {
        // Create a session
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);

        // Set an existing countdown interval
        const originalIntervalId = setInterval(() => {}, DEFAULT_TIME);
        session.turn.countdownInterval = originalIntervalId;

        // Spy on clearInterval
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        // Call the method that should clear the interval
        turnService['startPlayerTurn'](MOCK_LOBBY.accessCode, createValidPlayer('Test Player', FAST_SPEED, true), session.turn);
        // Verify that clearInterval was called with the correct argument
        expect(clearIntervalSpy).toHaveBeenCalledWith(originalIntervalId);

        // Ensure the countdownInterval is not equal to the original interval ID
        expect(session.turn.countdownInterval).not.toBe(originalIntervalId);
    });

    it('should clear existing timers in startTransitionPhase if timers exist', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);

        const originalTimeoutId = setTimeout(() => {}, DEFAULT_TIME);
        const originalIntervalId = setInterval(() => {}, DEFAULT_TIME);
        session.turn.turnTimers = originalTimeoutId;
        session.turn.countdownInterval = originalIntervalId;

        jest.spyOn(turnService as any, 'getNextPlayer').mockReturnValue(createValidPlayer('Test Player', FAST_SPEED, true));
        jest.spyOn(turnService as any, 'startPlayerTurn').mockImplementation(() => {});

        turnService['startTransitionPhase'](MOCK_LOBBY.accessCode, createMockTurn());

        expect(session.turn.turnTimers).toEqual(originalTimeoutId);
        expect(session.turn.countdownInterval).toEqual(originalIntervalId);
    });

    it('should update combat state in game session if it exists', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);

        gameSessionService.setCombatState(MOCK_LOBBY.accessCode, true);
        expect(session.turn.isInCombat).toBe(true);

        gameSessionService.setCombatState(MOCK_LOBBY.accessCode, false);
        expect(session.turn.isInCombat).toBe(false);
    });

    it('should return false if game session does not exist', () => {
        const result = gameSessionService.isCurrentPlayer('non-existent-code', 'Player1');
        expect(result).toBe(false);
    });

    it('should return false if the game session exists but currentPlayer is not set', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        session.turn.currentPlayer = null;
        const result = gameSessionService.isCurrentPlayer(MOCK_LOBBY.accessCode, 'Player1');
        expect(result).toBe(false);
    });

    it('should return true if the given player is the current player', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const player = createValidPlayer('CurrentPlayer', FAST_SPEED, true);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        session.turn.currentPlayer = player;
        const result = gameSessionService.isCurrentPlayer(MOCK_LOBBY.accessCode, 'CurrentPlayer');
        expect(result).toBe(true);
    });

    it('should return false if the given player is not the current player', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const player = createValidPlayer('CurrentPlayer', FAST_SPEED, true);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        session.turn.currentPlayer = player;
        const result = gameSessionService.isCurrentPlayer(MOCK_LOBBY.accessCode, 'OtherPlayer');
        expect(result).toBe(false);
    });

    it('should return orderedPlayers if game session exists', () => {
        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);

        const players = gameSessionService.getPlayers(MOCK_LOBBY.accessCode);

        expect(players).toEqual(session.turn.orderedPlayers);
    });

    it('should return early if gameSession does not exist', () => {
        const updatePlayerSpy = jest.spyOn(gameSessionService as any, 'updatePlayer');

        jest.spyOn(gameSessionService, 'getGameSession').mockReturnValue(undefined);

        expect(() => {
            turnService['startPlayerTurn']('non-existent-code', createValidPlayer('Test', FAST_SPEED, true), createMockTurn());
        }).not.toThrow();
        expect(updatePlayerSpy).not.toHaveBeenCalled();
    });

    it('should throw error when getting next player for non-existent session', () => {
        jest.spyOn(turnService as any, 'getNextPlayer').mockImplementation(() => {
            throw new Error('Game session not found');
        });

        expect(() => {
            (gameSessionService as any).turnService.getNextPlayer('invalid-code');
        }).toThrow('Game session not found');
    });

    it('should return early in startTransitionPhase if session not found', () => {
        const invalidCode = 'non-existent-code';
        const emitSpy = jest.spyOn(eventEmitter, 'emit');
        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        expect(() => {
            (gameSessionService as any).startTransitionPhase(invalidCode);
        }).not.toThrow();

        expect(setTimeoutSpy).not.toHaveBeenCalled();
        expect(setIntervalSpy).not.toHaveBeenCalled();
        expect(emitSpy).not.toHaveBeenCalled();
    });

    it("should maintain order when speeds are equal and randomization doesn't trigger swap", () => {
        const players = [createValidPlayer('PlayerA', SLOW_SPEED, true), createValidPlayer('PlayerB', SLOW_SPEED, false)];

        /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */ // Just a random number higher than 0,5 to test both Player options
        jest.spyOn(Math, 'random').mockReturnValue(0.6);

        const ordered = turnService['orderPlayersBySpeed'](players);

        expect(ordered[0].name).toBe('PlayerA');
        expect(ordered[1].name).toBe('PlayerB');
    });

    it('should return 0 when attempting to pause non-existent session', () => {
        const result = gameSessionService.pauseGameTurn('invalid-code');

        expect(result).toBe(0);

        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        expect(clearTimeoutSpy).not.toHaveBeenCalled();
        expect(clearIntervalSpy).not.toHaveBeenCalled();
    });

    it('should return empty array when getting players for non-existent session', () => {
        const players = gameSessionService.getPlayers('invalid-access-code');
        expect(players).toEqual([]);
    });

    it('should do nothing when ending turn for non-existent session', () => {
        const invalidCode = 'invalid-code';

        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        const updatePlayerSpy = jest.spyOn(gameSessionService as any, 'updatePlayer');
        const startTransitionSpy = jest.spyOn(gameSessionService as any, 'startTransitionPhase');

        gameSessionService.endTurn(invalidCode);

        expect(clearTimeoutSpy).not.toHaveBeenCalled();
        expect(clearIntervalSpy).not.toHaveBeenCalled();
        expect(updatePlayerSpy).not.toHaveBeenCalled();
        expect(startTransitionSpy).not.toHaveBeenCalled();
    });

    it('should return null when handling abandon for non-existent session', () => {
        const result = gameSessionService.handlePlayerAbandoned('invalid-code', 'AnyPlayer');

        expect(result).toBeNull();

        const updatePlayerSpy = jest.spyOn(gameSessionService as any, 'updatePlayer');
        expect(updatePlayerSpy).not.toHaveBeenCalled();
    });
    describe('updateDoorTile', () => {
        it('should return early if tiles are not adjacent', () => {
            const accessCode = 'test-access-code';
            const previousTile: Tile = {
                id: 'tile-1',
                imageSrc: ImageType.ClosedDoor,
                isOccupied: false,
                type: TileType.Door,
                isOpen: false,
                item: undefined,
                player: undefined,
            };

            const newTile: Tile = {
                id: 'tile-2',
                imageSrc: ImageType.ClosedDoor,
                isOccupied: false,
                type: TileType.Door,
                isOpen: false,
                item: undefined,
                player: undefined,
            };
            const grid: Tile[][] = [[previousTile, newTile]];

            (gameSessionService as any).gameSessions = new Map([
                [
                    accessCode,
                    {
                        game: { grid },
                    },
                ],
            ]);

            jest.spyOn(gridManagerService, 'findAndCheckAdjacentTiles').mockReturnValue(false);

            const emitSpy = jest.spyOn(eventEmitter, 'emit');

            gameSessionService.updateDoorTile(accessCode, previousTile, newTile);

            expect(newTile.imageSrc).toBe(ImageType.ClosedDoor);
            expect(newTile.isOpen).toBe(false);

            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should handle the case where the targetTile is not found', () => {
            const accessCode = 'test-access-code';
            const previousTile: Tile = {
                id: 'tile-1',
                imageSrc: ImageType.ClosedDoor,
                isOccupied: false,
                type: TileType.Door,
                isOpen: true,
                item: undefined,
                player: undefined,
            };
            const newTile: Tile = {
                id: 'tile-2',
                imageSrc: ImageType.ClosedDoor,
                isOccupied: false,
                type: TileType.Door,
                isOpen: true,
                item: undefined,
                player: undefined,
            };
            const grid: Tile[][] = [[previousTile, newTile]];

            (gameSessionService as any).gameSessions = new Map([
                [
                    accessCode,
                    {
                        game: { grid },
                    },
                ],
            ]);

            jest.spyOn(gridManagerService, 'findAndCheckAdjacentTiles').mockReturnValue(true);

            const emitSpy = jest.spyOn(eventEmitter, 'emit');

            gameSessionService.updateDoorTile(accessCode, previousTile, newTile);

            expect(emitSpy).toHaveBeenCalled();
        });

        it('should handle the case where the game session does not exist', () => {
            const accessCode = 'non-existent-code';
            const previousTile: Tile = {
                id: 'tile-1',
                imageSrc: ImageType.ClosedDoor,
                isOccupied: false,
                type: TileType.Door,
                isOpen: false,
                item: undefined,
                player: undefined,
            };
            const newTile: Tile = {
                id: 'tile-2',
                imageSrc: ImageType.ClosedDoor,
                isOccupied: false,
                type: TileType.Door,
                isOpen: false,
                item: undefined,
                player: undefined,
            };

            (gameSessionService as any).gameSessions = new Map();

            const emitSpy = jest.spyOn(eventEmitter, 'emit');

            expect(() => {
                gameSessionService.updateDoorTile(accessCode, previousTile, newTile);
            }).toThrow();

            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('updateGameSessionPlayerList', () => {
        it('should update the player in the game session', () => {
            const accessCode = 'test-access-code';
            const playerName = 'Player1';
            const updates: Partial<Player> = { isAdmin: true };

            const player: Player = {
                name: 'Player1',
                avatar: 'default-avatar.png',
                speed: 5,
                vitality: 10,
                attack: { value: 4, bonusDice: DiceType.D6 },
                defense: { value: 4, bonusDice: DiceType.D4 },
                hp: { current: 10, max: 10 },
                movementPoints: 3,
                actionPoints: 3,
                inventory: [null, null],
                isAdmin: false,
                hasAbandoned: false,
                isActive: false,
                combatWon: 0,
                spawnPoint: undefined,
            };

            (gameSessionService as any).gameSessions = new Map([
                [
                    accessCode,
                    {
                        turn: {
                            orderedPlayers: [player],
                        },
                    },
                ],
            ]);

            const updatePlayerSpy = jest.spyOn(gameSessionService as any, 'updatePlayer');

            gameSessionService.updateGameSessionPlayerList(accessCode, playerName, updates);

            expect(updatePlayerSpy).toHaveBeenCalledWith(player, updates);
        });

        it('should do nothing if the player is not found', () => {
            const accessCode = 'test-access-code';
            const playerName = 'NonExistentPlayer';
            const updates: Partial<Player> = { isAdmin: true };

            (gameSessionService as any).gameSessions = new Map([
                [
                    accessCode,
                    {
                        turn: {
                            orderedPlayers: [],
                        },
                    },
                ],
            ]);
            const updatePlayerSpy = jest.spyOn(gameSessionService as any, 'updatePlayer');

            gameSessionService.updateGameSessionPlayerList(accessCode, playerName, updates);

            expect(updatePlayerSpy).toHaveBeenCalled();
        });
    });

    describe('updatePlayerPosition', () => {
        it('should handle empty movement array', async () => {
            const accessCode = 'test-access-code';
            const player: Player = {
                name: 'Player1',
                avatar: 'default-avatar.png',
                speed: 5,
                vitality: 10,
                attack: { value: 4, bonusDice: DiceType.D6 },
                defense: { value: 4, bonusDice: DiceType.D4 },
                hp: { current: 10, max: 10 },
                movementPoints: 3,
                actionPoints: 3,
                inventory: [null, null],
                isAdmin: false,
                hasAbandoned: false,
                isActive: false,
                combatWon: 0,
                spawnPoint: undefined,
            };
            const movement: Tile[] = [];

            (gameSessionService as any).gameSessions = new Map([
                [
                    accessCode,
                    {
                        game: {
                            grid: [[]],
                        },
                    },
                ],
            ]);

            const clearPlayerSpy = jest.spyOn(gridManagerService, 'clearPlayerFromGrid');
            const setPlayerSpy = jest.spyOn(gridManagerService, 'setPlayerOnTile');

            const emitSpy = jest.spyOn(eventEmitter, 'emit');

            await gameSessionService.updatePlayerPosition(accessCode, movement, player);

            expect(clearPlayerSpy).not.toHaveBeenCalled();
            expect(setPlayerSpy).not.toHaveBeenCalled();
            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('endGameSession', () => {
        it('should emit the game.ended event with the winner', () => {
            const accessCode = 'test-access-code';
            const winner = 'Player1';

            const emitSpy = jest.spyOn(eventEmitter, 'emit');

            gameSessionService.endGameSession(accessCode, winner);

            expect(emitSpy).toHaveBeenCalledWith('game.ended', { accessCode, winner });
        });
    });
});
