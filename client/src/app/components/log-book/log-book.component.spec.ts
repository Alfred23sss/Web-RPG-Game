import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogBookComponent } from './log-book.component';

describe('LogBookComponent', () => {
    let component: LogBookComponent;
    let fixture: ComponentFixture<LogBookComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LogBookComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(LogBookComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
