import { TestBed } from '@angular/core/testing';
import { CombatSocketService } from './combat-socket.service';

describe('CombatSocketService', () => {
    let service: CombatSocketService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CombatSocketService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
