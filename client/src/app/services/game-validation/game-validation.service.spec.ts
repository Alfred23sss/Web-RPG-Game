import { TestBed } from '@angular/core/testing';

import { GameValidationService } from './game-validation.service';

describe('GameValidationService', () => {
    let service: GameValidationService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameValidationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
