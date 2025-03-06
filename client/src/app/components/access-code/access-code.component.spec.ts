import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccessCodeComponent } from './access-code.component';
import { MatDialogRef } from '@angular/material/dialog';
// eslint-disable-next-line import/no-deprecated
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AccessCodeComponent', () => {
    let component: AccessCodeComponent;
    let fixture: ComponentFixture<AccessCodeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                AccessCodeComponent,
                // eslint-disable-next-line import/no-deprecated
                HttpClientTestingModule,
            ],
            providers: [{ provide: MatDialogRef, useValue: { close: jasmine.createSpy() } }],
        }).compileComponents();

        fixture = TestBed.createComponent(AccessCodeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
