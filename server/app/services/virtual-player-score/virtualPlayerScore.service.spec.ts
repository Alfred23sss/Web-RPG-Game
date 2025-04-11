import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerScoreService } from './virtualPlayerScore.service';

describe('VirtualPlayerScoreService', () => {
    let service: VirtualPlayerScoreService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerScoreService,
                {
                    provide: GridManagerService,
                    useValue: {
                        findTileByPlayer: jest.fn(),
                    },
                },
                {
                    provide: VirtualPlayerActionsService,
                    useValue: {
                        getPathForMove: jest.fn(),
                        calculateTotalMovementCost: jest.fn(),
                        areOnSameTeam: jest.fn(),
                        isFlagInInventory: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<VirtualPlayerScoreService>(VirtualPlayerScoreService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
