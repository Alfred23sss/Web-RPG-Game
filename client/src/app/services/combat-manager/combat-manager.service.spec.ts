import { TestBed } from '@angular/core/testing';

import { CombatManagerService } from './combat-manager.service';

describe('CombatManagerService', () => {
    let service: CombatManagerService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CombatManagerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
