import { TestBed } from '@angular/core/testing';

import { RoomValidationService } from './room-validation.service';

describe('RoomValidationService', () => {
    let service: RoomValidationService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(RoomValidationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
