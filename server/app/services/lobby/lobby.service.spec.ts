import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LobbyService } from './lobby.service';

describe('LobbyService', () => {
    let lobbyService: LobbyService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyService,
                {
                    provide: AccessCodesService,
                    useValue: {
                        generateAccessCode: jest.fn(),
                        removeAccessCode: jest.fn(),
                    },
                },
                {
                    provide: Logger,
                    useValue: {
                        log: jest.fn(),
                    },
                },
            ],
        }).compile();

        lobbyService = module.get<LobbyService>(LobbyService);
    });

    it('should be defined', () => {
        expect(lobbyService).toBeDefined();
    });
});
