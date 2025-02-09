import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { ConfirmComponent } from './confirm.component';

describe('ConfirmComponent', () => {
    let component: ConfirmComponent;
    let fixture: ComponentFixture<ConfirmComponent>;
    let snackBarRefSpy: jasmine.SpyObj<MatSnackBarRef<ConfirmComponent>>;

    beforeEach(async () => {
        snackBarRefSpy = jasmine.createSpyObj('MatSnackBarRef', ['dismiss', 'dismissWithAction']);

        await TestBed.configureTestingModule({
            declarations: [ConfirmComponent],
            providers: [
                { provide: MatSnackBarRef, useValue: snackBarRefSpy },
                { provide: MAT_SNACK_BAR_DATA, useValue: { message: 'Are you sure?' } },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ConfirmComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should display the provided message', () => {
        const messageElement = fixture.debugElement.query(By.css('span')).nativeElement;
        expect(messageElement.textContent).toContain('Are you sure?');
    });

    it('should call dismissWithAction() when Yes is clicked', () => {
        const yesButton = fixture.debugElement.query(By.css('button:last-child')).nativeElement;
        yesButton.click();
        expect(snackBarRefSpy.dismissWithAction).toHaveBeenCalled();
    });

    it('should call dismiss() when No is clicked', () => {
        const noButton = fixture.debugElement.query(By.css('button:first-child')).nativeElement;
        noButton.click();
        expect(snackBarRefSpy.dismiss).toHaveBeenCalled();
    });
});
