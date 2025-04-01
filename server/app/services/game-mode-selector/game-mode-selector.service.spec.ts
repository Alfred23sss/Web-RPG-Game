import { GameModeType } from '@app/enums/enums';
import { Test, TestingModule } from '@nestjs/testing';
// eslint-disable-next-line no-restricted-imports
import { ClassicGameSessionService } from '../classic-game-session/classic-game-session.service';
// eslint-disable-next-line no-restricted-imports
import { CTFGameSessionService } from '../ctf-game-session/ctf-game-session.service';
import { GameModeSelectorService } from './game-mode-selector.service';

describe('GameModeSelectorService', () => {
    let service: GameModeSelectorService;
    let mockClassicService: jest.Mocked<ClassicGameSessionService>;
    let mockCTFService: jest.Mocked<CTFGameSessionService>;

    beforeEach(async () => {
        mockClassicService = {} as any;

        mockCTFService = {} as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameModeSelectorService,
                {
                    provide: ClassicGameSessionService,
                    useValue: mockClassicService,
                },
                {
                    provide: CTFGameSessionService,
                    useValue: mockCTFService,
                },
            ],
        }).compile();

        service = module.get<GameModeSelectorService>(GameModeSelectorService);
    });

    describe('registerGameMode', () => {
        it('should register a game mode for an access code', () => {
            const accessCode = '1234';
            service.registerGameMode(accessCode, GameModeType.Classic);
            expect((service as any).gameModes.get(accessCode)).toBe(GameModeType.Classic);
        });
    });

    describe('getServiceByAccessCode', () => {
        it('should return classic service for classic game mode', () => {
            const accessCode = '1234';
            service.registerGameMode(accessCode, GameModeType.Classic);

            const result = service.getServiceByAccessCode(accessCode);
            expect(result).toBe(mockClassicService);
        });

        it('should return CTF service for CTF game mode', () => {
            const accessCode = '1234';
            service.registerGameMode(accessCode, GameModeType.CTF);

            const result = service.getServiceByAccessCode(accessCode);
            expect(result).toBe(mockCTFService);
        });

        it('should throw error for unregistered access code', () => {
            const accessCode = '1234';

            expect(() => service.getServiceByAccessCode(accessCode)).toThrowError(`No game mode registered for access code ${accessCode}`);
        });
    });

    describe('unregisterGameMode', () => {
        it('should remove the game mode registration', () => {
            const accessCode = '1234';
            service.registerGameMode(accessCode, GameModeType.Classic);
            expect(() => service.getServiceByAccessCode(accessCode)).not.toThrow();
            service.unregisterGameMode(accessCode);
            expect(() => service.getServiceByAccessCode(accessCode)).toThrow();
        });
    });

    describe('getService', () => {
        it('should return classic service by default', () => {
            const result = service.getService(GameModeType.Classic);
            expect(result).toBe(mockClassicService);
        });

        it('should return CTF service for CTF mode', () => {
            const result = service.getService(GameModeType.CTF);
            expect(result).toBe(mockCTFService);
        });

        it('should return classic service for undefined mode', () => {
            const result = service.getService(undefined as unknown as GameModeType);
            expect(result).toBe(mockClassicService);
        });
    });
});
