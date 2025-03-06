import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LobbyGateway } from './lobby.gateway';

describe('LobbyGateway', () => {
    let gateway: LobbyGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyGateway,
                {
                    provide: LobbyService,
                    useValue: {
                        createLobby: jest.fn(),
                        getLobby: jest.fn(),
                        joinLobby: jest.fn(),
                        leaveLobby: jest.fn(),
                        getLobbyPlayers: jest.fn(),
                        getLobbyIdByPlayer: jest.fn(),
                    },
                },
                {
                    provide: Logger,
                    useValue: {
                        log: jest.fn(),
                    },
                },
                {
                    provide: AccessCodesService,
                    useValue: {
                        removeAccessCode: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<LobbyGateway>(LobbyGateway);
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });
});
