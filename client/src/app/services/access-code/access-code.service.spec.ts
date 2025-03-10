/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { MOCK_GAMES } from '@app/constants/global.constants';
import { DiceType } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { of, throwError } from 'rxjs';
import { AccessCodeService } from './access-code.service';

describe('AccessCodeService', () => {
    let service: AccessCodeService;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;

    const MOCK_LOBBY: Lobby = {
        isLocked: false,
        accessCode: 'TEST',
        game: null,
        players: [],
        maxPlayers: 4,
    };

    const MOCK_PLAYER: Player = {
        name: 'Test Player',
        avatar: 'avatar.png',
        hp: { current: 100, max: 100 },
        speed: 5,
        attack: { value: 4, bonusDice: DiceType.D6 },
        defense: { value: 4, bonusDice: DiceType.D4 },
        movementPoints: 3,
        actionPoints: 3,
        inventory: [null, null],
        isAdmin: false,
        hasAbandoned: false,
        isActive: false,
        combatWon: 0,
    };

    beforeEach(() => {
        const socketSpy = jasmine.createSpyObj('SocketClientService', ['getLobby']);

        TestBed.configureTestingModule({
            providers: [{ provide: SocketClientService, useValue: socketSpy }],
        });

        service = TestBed.inject(AccessCodeService);
        socketClientServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set and get access code', () => {
        const testCode = 'ABCD1234';
        service.setAccessCode(testCode);
        expect(service.getAccessCode()).toBe(testCode);
    });

    it('should return empty access code initially', () => {
        expect(service.getAccessCode()).toBe('');
    });

    it('should resolve with lobby data on success', async () => {
        const testCode = 'TEST123';
        const fullMockLobby: Lobby = {
            ...MOCK_LOBBY,
            game: MOCK_GAMES[0],
            players: [MOCK_PLAYER],
            isLocked: true,
            maxPlayers: 8,
        };

        socketClientServiceSpy.getLobby.and.returnValue(of(fullMockLobby));

        const result = await service.getLobbyData(testCode);
        expect(result).toEqual(fullMockLobby);
        expect(result.isLocked).toBeTrue();
        expect(result.maxPlayers).toBe(8);
        expect(result.game).toEqual(MOCK_GAMES[0]);
        expect(result.players).toContain(MOCK_PLAYER);
        expect(socketClientServiceSpy.getLobby).toHaveBeenCalledWith(testCode);
    });

    it('should reject with error on failure', async () => {
        const testCode = 'INVALID';
        const mockError = new Error('Connection error');
        socketClientServiceSpy.getLobby.and.returnValue(throwError(() => mockError));

        try {
            await service.getLobbyData(testCode);
            fail('Expected promise to reject');
        } catch (error) {
            expect(error).toBe(mockError);
            expect(socketClientServiceSpy.getLobby).toHaveBeenCalledWith(testCode);
        }
    });

    it('should handle empty access code', async () => {
        const testCode = '';
        socketClientServiceSpy.getLobby.and.returnValue(of(MOCK_LOBBY));

        const result = await service.getLobbyData(testCode);
        expect(result).toEqual(MOCK_LOBBY);
        expect(socketClientServiceSpy.getLobby).toHaveBeenCalledWith(testCode);
    });
});
