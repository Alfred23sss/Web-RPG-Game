import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { VirtualPlayerScoreService } from '@app/services/virtual-player-score/virtualPlayerScore.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerBehaviorService } from './virtualPlayerBehavior.service';

describe('VirtualPlayerBehaviorService', () => {
    let service: VirtualPlayerBehaviorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerBehaviorService,
                { provide: GameCombatService, useValue: {} },
                { provide: VirtualPlayerActionsService, useValue: {} },
                { provide: VirtualPlayerScoreService, useValue: {} },
            ],
        }).compile();

        service = module.get<VirtualPlayerBehaviorService>(VirtualPlayerBehaviorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
