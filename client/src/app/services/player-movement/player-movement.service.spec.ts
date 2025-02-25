import { TestBed } from '@angular/core/testing';
import { GridService } from '@app/services/grid/grid-service.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';

describe('PlayerMovementService', () => {
    let service: PlayerMovementService;
    let mockGridService: jasmine.SpyObj<GridService>;

    beforeEach(() => {
        mockGridService = jasmine.createSpyObj('GridService', ['getGrid']);

        TestBed.configureTestingModule({
            providers: [{ provide: GridService, useValue: mockGridService }],
        });

        service = TestBed.inject(PlayerMovementService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
