import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameCombatComponent } from './game-combat.component';

describe('GameCombatComponent', () => {
    let component: GameCombatComponent;
    let fixture: ComponentFixture<GameCombatComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameCombatComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCombatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
