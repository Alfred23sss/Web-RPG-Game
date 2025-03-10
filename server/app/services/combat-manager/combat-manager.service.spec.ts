import { Test, TestingModule } from '@nestjs/testing';
import { CombatManagerService } from './combat-manager.service';

describe('CombatManagerService', () => {
    let service: CombatManagerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CombatManagerService],
        }).compile();

        service = module.get<CombatManagerService>(CombatManagerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
