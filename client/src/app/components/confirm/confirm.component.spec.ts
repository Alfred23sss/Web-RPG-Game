import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { ConfirmComponent } from './confirm.component';

describe('ConfirmComponent', () => {
    let component: ConfirmComponent;
    let fixture: ComponentFixture<ConfirmComponent>;
    let snackBarRefSpy: jasmine.SpyObj<MatSnackBarRef<ConfirmComponent>>;

    beforeEach(() => {
        snackBarRefSpy = jasmine.createSpyObj('MatSnackBarRef', ['dismiss', 'dismissWithAction']);

        TestBed.configureTestingModule({
            imports: [ConfirmComponent],
            providers: [
                { provide: MatSnackBarRef, useValue: snackBarRefSpy },
                { provide: MAT_SNACK_BAR_DATA, useValue: { message: 'Test message' } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ConfirmComponent);
        component = fixture.componentInstance;
    });

    it('should dismiss the snackbar with action when onYesClick is called', () => {
        component.onYesClick();
        expect(snackBarRefSpy.dismissWithAction).toHaveBeenCalled();
    });

    it('should dismiss the snackbar when onNoClick is called', () => {
        component.onNoClick();
        expect(snackBarRefSpy.dismiss).toHaveBeenCalled();
    });
});
