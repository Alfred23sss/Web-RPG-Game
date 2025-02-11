import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmComponent } from '@app/components/confirm/confirm.component';
import { SNACKBAR_CONFIG } from '@app/constants/global.constants';
import { Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class SnackbarService {
    constructor(private snackBar: MatSnackBar) {}

    showMessage(message: string, action: string = SNACKBAR_CONFIG.action, duration: number = SNACKBAR_CONFIG.duration): void {
        this.snackBar.open(message, action, { duration });
    }

    showConfirmation(message: string): Observable<boolean> {
        const subject = new Subject<boolean>();

        const snackBarRef = this.snackBar.openFromComponent(ConfirmComponent, {
            data: { message },
            duration: 0,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
        });

        snackBarRef.afterDismissed().subscribe(() => subject.next(false));
        snackBarRef.onAction().subscribe(() => {
            subject.next(true);
            snackBarRef.dismiss();
        });

        return subject.asObservable();
    }
}
