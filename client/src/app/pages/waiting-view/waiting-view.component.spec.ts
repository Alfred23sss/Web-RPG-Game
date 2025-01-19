import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaitingViewComponent } from './waiting-view.component';

describe('WaitingViewComponent', () => {
    let component: WaitingViewComponent;
    let fixture: ComponentFixture<WaitingViewComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WaitingViewComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitingViewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
