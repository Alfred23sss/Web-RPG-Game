import { TestBed } from '@angular/core/testing';
import { CharacterAttributesService } from './characterAttributes.service';

describe('GameService', () => {
    let service: CharacterAttributesService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CharacterAttributesService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
