import { PlayerMovementService } from './playerMovement.service';

describe('PlayerMovementService', () => {
    let service: PlayerMovementService;
    beforeEach(async () => {
        service = new PlayerMovementService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
