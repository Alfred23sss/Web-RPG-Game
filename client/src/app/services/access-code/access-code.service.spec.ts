/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { MOCK_ACCESS_CODE, MOCK_GAME, MOCK_LOBBY, MOCK_PLAYER } from '@app/constants/global.constants';
import { Lobby } from '@app/interfaces/lobby';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { of, throwError } from 'rxjs';
import { AccessCodeService } from './access-code.service';

describe('AccessCodeService', () => {
    let service: AccessCodeService;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;

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
        service.setAccessCode(MOCK_ACCESS_CODE);
        expect(service.getAccessCode()).toBe(MOCK_ACCESS_CODE);
    });

    it('should return empty access code initially', () => {
        expect(service.getAccessCode()).toBe('');
    });

    it('should resolve with lobby data on success', async () => {
        const fullMockLobby: Lobby = {
            ...MOCK_LOBBY,
            game: MOCK_GAME,
            players: [MOCK_PLAYER],
            isLocked: true,
            maxPlayers: 8,
        };

        socketClientServiceSpy.getLobby.and.returnValue(of(fullMockLobby));

        const result = await service.getLobbyData(MOCK_ACCESS_CODE);
        expect(result).toEqual(fullMockLobby);
        expect(result.isLocked).toBeTrue();
        expect(result.maxPlayers).toBe(8);
        expect(result.game).toEqual(MOCK_GAME);
        expect(result.players).toContain(MOCK_PLAYER);
        expect(socketClientServiceSpy.getLobby).toHaveBeenCalledWith(MOCK_ACCESS_CODE);
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
