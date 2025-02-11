import { TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';
import { ConfirmComponent } from '@app/components/confirm/confirm.component';
import { SNACKBAR_CONFIG } from '@app/constants/global.constants';
import { of } from 'rxjs';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
    let service: SnackbarService;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let snackBarRefMock: jasmine.SpyObj<MatSnackBarRef<unknown>>;

    beforeEach(() => {
        snackBarRefMock = jasmine.createSpyObj('MatSnackBarRef', ['afterDismissed', 'onAction', 'dismiss']);
        snackBarRefMock.afterDismissed.and.returnValue(of({ dismissedByAction: false }));
        snackBarRefMock.onAction.and.returnValue(of(undefined));

        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent']);
        snackBarSpy.openFromComponent.and.returnValue(snackBarRefMock);

        TestBed.configureTestingModule({
            imports: [MatSnackBarModule],
            providers: [SnackbarService, { provide: MatSnackBar, useValue: snackBarSpy }],
        });

        service = TestBed.inject(SnackbarService);
    });

    describe('showMessage', () => {
        it('should open a snackbar with the provided message, action, and duration', () => {
            const message = 'Test message';
            const action = SNACKBAR_CONFIG.ACTION;
            const duration = SNACKBAR_CONFIG.DURATION;

            service.showMessage(message);

            expect(snackBarSpy.open).toHaveBeenCalledOnceWith(message, action, { duration });
        });

        it('should open a snackbar with a custom action and duration', () => {
            const message = 'Custom message';
            const action = 'Close';
            const duration = 5000;

            service.showMessage(message, action, duration);

            expect(snackBarSpy.open).toHaveBeenCalledOnceWith(message, action, { duration });
        });
    });

    describe('showConfirmation', () => {
        it('should open a confirmation snackbar with the provided message', () => {
            const message = 'Are you sure?';
            service.showConfirmation(message).subscribe();

            expect(snackBarSpy.openFromComponent).toHaveBeenCalledOnceWith(ConfirmComponent, {
                data: { message },
                duration: 0,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
            });
        });

        it('should emit false when snackbar is dismissed without action', (done) => {
            const message = 'Are you sure?';

            snackBarRefMock.afterDismissed.and.returnValue(of({ dismissedByAction: false }));

            service.showConfirmation(message).subscribe((result) => {
                expect(result).toBeFalse();
                done();
            });

            snackBarRefMock.afterDismissed().subscribe();
        });

        it('should emit true when action is taken', (done) => {
            const message = 'Are you sure?';

            snackBarRefMock.onAction.and.returnValue(of(undefined));

            service.showConfirmation(message).subscribe((result) => {
                expect(result).toBeTrue();
                done();
            });

            snackBarRefMock.onAction().subscribe();
        });
    });
});
