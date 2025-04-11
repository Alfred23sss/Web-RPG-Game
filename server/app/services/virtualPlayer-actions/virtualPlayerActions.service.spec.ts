import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { PlayerMovementService } from '@app/services/player-movement/playerMovement.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerActionsService } from './virtualPlayerActions.service';

describe('VirtualPlayerActionsService', () => {
    let service: VirtualPlayerActionsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerActionsService,
                { provide: PlayerMovementService, useValue: {} },
                { provide: EventEmitter2, useValue: {} },
                { provide: GameCombatService, useValue: {} },
                { provide: GridManagerService, useValue: {} },
                { provide: GameSessionService, useValue: {} },
            ],
        }).compile();

        service = module.get<VirtualPlayerActionsService>(VirtualPlayerActionsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
