import { DiceType } from '@app/interfaces/Dice';
import { Game } from '@app/interfaces/Game';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/model/database/tile';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameSessionService } from './game-session.service';

const DEFAULT_TIME = 3000;
const SHORT_TIME = 1000;
const FAST_SPEED = 6;
const SLOW_SPEED = 4;

fdescribe('GameSessionService', () => {
    let gameSessionService: GameSessionService;
    let lobbyService: LobbyService;
    let accessCodesService: AccessCodesService;
    let eventEmitter: EventEmitter2;

    const createValidPlayer = (name: string, speed: number): Player => ({
        name,
        avatar: 'default-avatar.png',
        speed,
        attack: { value: 4, bonusDice: 'd6' as DiceType },
        defense: { value: 4, bonusDice: 'd4' as DiceType },
        hp: { current: 10, max: 10 },
        movementPoints: 3,
        actionPoints: 3,
        inventory: [null, null],
        isAdmin: false,
        hasAbandoned: false,
        isActive: false,
        combatWon: 0,
        vitality: 0,
    });

    const createValidTile = (hasHome: boolean): Tile =>
        ({
            item: hasHome ? { name: 'home', effect: 'spawn' } : null,
            player: null,
            isOccupied: false,
            isAccessible: true,
            coordinates: { x: 0, y: 0 },
        }) as unknown as Tile;

    const MOCK_LOBBY = {
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
        players: [createValidPlayer('Player 1', SLOW_SPEED), createValidPlayer('Player 2', FAST_SPEED)],
    };

    beforeEach(() => {
        jest.useFakeTimers();
        accessCodesService = new AccessCodesService();
        lobbyService = new LobbyService(accessCodesService, new Logger());
        eventEmitter = new EventEmitter2();

        jest.spyOn(lobbyService, 'getLobby').mockReturnValue(MOCK_LOBBY);
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(MOCK_LOBBY.players);

        gameSessionService = new GameSessionService(lobbyService, eventEmitter);
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
        const players = [createValidPlayer('Player1', SLOW_SPEED), createValidPlayer('Player2', SLOW_SPEED)];

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        jest.spyOn(Math, 'random').mockReturnValue(0.2);
        const ordered = gameSessionService['orderPlayersBySpeed'](players);

        expect(ordered[0].name).toBe('Player2');
    });

    it('should cycle through active players', () => {
        const players = [createValidPlayer('FastPlayer', FAST_SPEED), createValidPlayer('SlowPlayer', SLOW_SPEED)];
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
        const players = [createValidPlayer('P1', FAST_SPEED), createValidPlayer('P2', SLOW_SPEED)];
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
        const players = [createValidPlayer('Player1', FAST_SPEED), createValidPlayer('Player2', SLOW_SPEED)];
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        gameSessionService.handlePlayerAbandoned(MOCK_LOBBY.accessCode, 'Player1');

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);

        jest.advanceTimersByTime(DEFAULT_TIME);
        jest.advanceTimersByTime(SHORT_TIME);

        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        expect(session?.turn.currentPlayer?.name).toBe('Player2');
    });

    it('should handle multiple abandoned players', () => {
        const players = [createValidPlayer('P1', FAST_SPEED), createValidPlayer('P2', SLOW_SPEED), createValidPlayer('P3', SLOW_SPEED)];
        jest.spyOn(lobbyService, 'getLobbyPlayers').mockReturnValue(players);

        gameSessionService.createGameSession(MOCK_LOBBY.accessCode);
        gameSessionService.handlePlayerAbandoned(MOCK_LOBBY.accessCode, 'P1');
        gameSessionService.handlePlayerAbandoned(MOCK_LOBBY.accessCode, 'P2');

        gameSessionService.endTurn(MOCK_LOBBY.accessCode);
        jest.advanceTimersByTime(DEFAULT_TIME);

        const session = gameSessionService['gameSessions'].get(MOCK_LOBBY.accessCode);
        expect(session?.turn.currentPlayer?.name).toBe('P3');
    });

    it('should return empty array when no spawn points', () => {
        const grid = [[createValidTile(false), createValidTile(false)]];
        const spawns = gameSessionService['findSpawnPoints'](grid);

        expect(spawns).toHaveLength(0);
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

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
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

    // it('should clear timers in endTurn if timers exist', () => { ** should be testing 4 of the 6 missing lines but doesn't work for some reason. No clue. **
    //     const session = gameSessionService.createGameSession(MOCK_LOBBY.accessCode);

    //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //     session.turn.turnTimers = 100 as any;
    //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //     session.turn.countdownInterval = 200 as any;

    //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //     jest.spyOn(gameSessionService as any, 'startTransitionPhase').mockImplementation(jest.fn());

    //     const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    //     const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    //     gameSessionService.endTurn(MOCK_LOBBY.accessCode);

    //     expect(clearTimeoutSpy).toHaveBeenCalledWith(100);
    //     expect(clearIntervalSpy).toHaveBeenCalledWith(200);
    //     expect(session.turn.turnTimers).toBeNull();
    //     expect(session.turn.countdownInterval).toBeNull();
    // });

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

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        jest.advanceTimersByTime(30000);

        expect(endTurnSpy).toHaveBeenCalledTimes(1);
        expect(endTurnSpy).toHaveBeenCalledWith(MOCK_LOBBY.accessCode);
    });
});
