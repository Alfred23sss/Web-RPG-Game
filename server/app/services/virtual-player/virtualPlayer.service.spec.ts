import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerBehaviorService } from '@app/services/virtual-player-behavior/virtualPlayerBehavior.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerService } from './virtualPlayer.service';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerService,
                { provide: EventEmitter2, useValue: {} },
                { provide: VirtualPlayerBehaviorService, useValue: {} },
                { provide: LobbyService, useValue: {} },
                { provide: VirtualPlayerActionsService, useValue: {} },
            ],
        }).compile();

        service = module.get<VirtualPlayerService>(VirtualPlayerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
