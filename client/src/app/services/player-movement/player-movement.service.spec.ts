import { TestBed } from '@angular/core/testing';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';

describe('playerMovementService', () => {
    let service: PlayerMovementService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PlayerMovementService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
