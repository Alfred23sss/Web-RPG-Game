import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common/services/logger.service';
import { EventEmitter2 } from 'eventemitter2';
import { GameSessionService } from './game-session.service';

describe('GameSessionService', () => {
    let gameSessionService: GameSessionService;
    let lobbyService: LobbyService;
    let accessCodesService: AccessCodesService;
    let logger: Logger;
    let eventEmitter: EventEmitter2;

    const mockLobby = {
        accessCode: 'test-access-code',
        isLocked: false,
        maxPlayers: 4,
        game: {
            id: 'game-id',
            name: 'Test Game',
            size: { width: 2, height: 2 },
            mode: 'classic',
            grid: [
                [{ item: { name: 'home' } }, { item: { name: 'home' } }],
                [{ item: { name: 'home' } }, { item: { name: 'home' } }],
            ],
        },
        players: [
            { name: 'Player 1', speed: 10, isActive: false, hasAbandoned: false },
            { name: 'Player 2', speed: 15, isActive: false, hasAbandoned: false },
        ],
    };

    beforeEach(() => {
        accessCodesService = new AccessCodesService();
        logger = new Logger();
        lobbyService = new LobbyService(accessCodesService, logger);
        eventEmitter = new EventEmitter2();

        gameSessionService = new GameSessionService(lobbyService, eventEmitter);
    });

    it('should be defined', () => {
        expect(gameSessionService).toBeDefined();
    });

    it('should handle player abandonment', () => {
        const playerName = 'Player 1';
        const player = gameSessionService.handlePlayerAbandoned(mockLobby.accessCode, playerName);

        expect(player).toBeDefined();
    });

    it('should get all players in the game session', () => {
        const players = gameSessionService.getPlayers(mockLobby.accessCode);

        expect(players).toBeDefined();
    });
});
