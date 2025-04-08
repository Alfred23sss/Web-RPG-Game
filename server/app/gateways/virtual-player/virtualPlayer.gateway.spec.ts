import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerGateway } from './virtualPlayer.gateway';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerCreationService } from '@app/services/virtual-player-creation/virtualPlayerCreation.service';
import { GameSessionService } from '@app/services/game-session/game-session.service'; // ✅ Add import
import { Logger } from '@nestjs/common';

describe('VirtualPlayerGateway', () => {
    let gateway: VirtualPlayerGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerGateway,
                {
                    provide: LobbyService,
                    useValue: {},
                },
                {
                    provide: VirtualPlayerCreationService,
                    useValue: {},
                },
                {
                    provide: GameSessionService,
                    useValue: {},
                },
                {
                    provide: Logger,
                    useValue: {},
                },
            ],
        }).compile();

        gateway = module.get<VirtualPlayerGateway>(VirtualPlayerGateway);
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });
});
