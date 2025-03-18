/* eslint-disable @typescript-eslint/no-explicit-any */
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { ConfirmComponent } from '@app/components/confirm/confirm.component';
import { SNACKBAR_CONFIG } from '@app/constants/global.constants';
import { Subject } from 'rxjs';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
    let service: SnackbarService;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let snackBarRefMock: jasmine.SpyObj<MatSnackBarRef<unknown>>;
    let dismissSubject: Subject<{ dismissedByAction: boolean }>;
    let actionSubject: Subject<void>;

    beforeEach(() => {
        dismissSubject = new Subject();
        actionSubject = new Subject();

        snackBarRefMock = jasmine.createSpyObj('MatSnackBarRef', ['afterDismissed', 'onAction', 'dismiss']);
        snackBarRefMock.afterDismissed.and.returnValue(dismissSubject.asObservable());
        snackBarRefMock.onAction.and.returnValue(actionSubject.asObservable());

        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent']);
        snackBarSpy.open.and.returnValue(snackBarRefMock as unknown as MatSnackBarRef<TextOnlySnackBar>);
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
            const action = SNACKBAR_CONFIG.action;
            const duration = SNACKBAR_CONFIG.duration;

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

            service.showConfirmation(message).subscribe((result) => {
                expect(result).toBeFalse();
                done();
            });

            dismissSubject.next({ dismissedByAction: false });
        });

        it('should emit true when action is taken', (done) => {
            const message = 'Are you sure?';

            service.showConfirmation(message).subscribe((result) => {
                expect(result).toBeTrue();
                done();
            });

            actionSubject.next();
        });
    });

    describe('showMultipleMessages', () => {
        it('should not add duplicate messages to the queue', () => {
            (service as any).messageQueue = ['Existing message'];
            service.showMultipleMessages('Existing message');
            expect((service as any).messageQueue).toEqual(['Existing message']);
        });

        it('should add to queue and update when already displaying', () => {
            (service as any).isDisplaying = true;
            (service as any).snackBarRef = snackBarRefMock;

            service.showMultipleMessages('New message');

            expect((service as any).messageQueue).toEqual(['New message']);
            expect(snackBarRefMock.dismiss).toHaveBeenCalled();
            expect(snackBarSpy.open).toHaveBeenCalledWith('New message', SNACKBAR_CONFIG.action, jasmine.any(Object));
        });

        it('should initialize display when first message', () => {
            service.showMultipleMessages('First message');

            expect((service as any).isDisplaying).toBeTrue();
            expect((service as any).messageQueue).toEqual(['First message']);
            expect(snackBarSpy.open).toHaveBeenCalledWith('First message', SNACKBAR_CONFIG.action, jasmine.any(Object));
        });

        it('should combine multiple messages and handle dismissal', fakeAsync(() => {
            service.showMultipleMessages('Message 1');
            service.showMultipleMessages('Message 2');

            expect(snackBarSpy.open).toHaveBeenCalledWith('Message 1\nMessage 2', SNACKBAR_CONFIG.action, jasmine.any(Object));

            dismissSubject.next({ dismissedByAction: false });
            tick();

            expect((service as any).isDisplaying).toBeFalse();
            expect((service as any).messageQueue).toEqual([]);
            expect((service as any).snackBarRef).toBeNull();
        }));
    });

    describe('displayNextMessage', () => {
        it('should show combined messages and clear queue on dismiss', () => {
            (service as any).messageQueue = ['Message 1', 'Message 2'];
            (service as any).displayNextMessage(SNACKBAR_CONFIG.action, SNACKBAR_CONFIG.duration);

            expect(snackBarSpy.open).toHaveBeenCalledWith('Message 1\nMessage 2', SNACKBAR_CONFIG.action, { duration: SNACKBAR_CONFIG.duration });

            dismissSubject.next({ dismissedByAction: false });
            expect((service as any).isDisplaying).toBeFalse();
            expect((service as any).messageQueue).toEqual([]);
            expect((service as any).snackBarRef).toBeNull();
        });

        it('should handle multiple updates correctly', () => {
            (service as any).messageQueue = ['Message 1'];
            (service as any).displayNextMessage(SNACKBAR_CONFIG.action, SNACKBAR_CONFIG.duration);

            (service as any).messageQueue = ['Message 1', 'Message 2'];
            (service as any).updateSnackbarMessage();

            expect(snackBarRefMock.dismiss).toHaveBeenCalled();
            expect(snackBarSpy.open).toHaveBeenCalledWith('Message 1\nMessage 2', SNACKBAR_CONFIG.action, { duration: SNACKBAR_CONFIG.duration });
        });
    });
});
