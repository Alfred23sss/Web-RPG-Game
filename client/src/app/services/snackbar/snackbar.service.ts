import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { SNACKBAR_CONFIG } from '@app/constants/global.constants';
import { Observable, Subject } from 'rxjs';
import { ConfirmComponent } from '@app/components/confirm/confirm.component';
@Injectable({
    providedIn: 'root',
})
export class SnackbarService {
    private messageQueue: string[] = [];
    private isDisplaying = false;
    private snackBarRef: MatSnackBarRef<TextOnlySnackBar> | null = null;

    constructor(private snackBar: MatSnackBar) {}

    showMessage(message: string, action: string = SNACKBAR_CONFIG.action, duration: number = SNACKBAR_CONFIG.duration): void {
        this.snackBar.open(message, action, { duration });
    }

    showMultipleMessages(message: string, action: string = SNACKBAR_CONFIG.action, duration: number = SNACKBAR_CONFIG.duration): void {
        if (this.messageQueue.includes(message)) {
            return;
        }
        if (this.isDisplaying && this.snackBarRef) {
            this.messageQueue.push(message);
            this.updateSnackbarMessage();
        } else {
            this.isDisplaying = true;
            this.messageQueue = [message];
            this.displayNextMessage(action, duration);
        }
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

    private displayNextMessage(action: string, duration: number): void {
        const combinedMessage = this.messageQueue.join('\n');

        this.snackBarRef = this.snackBar.open(combinedMessage, action, { duration });

        this.snackBarRef.afterDismissed().subscribe(() => {
            this.isDisplaying = false;
            this.messageQueue = [];
            this.snackBarRef = null;
        });
    }

    private updateSnackbarMessage(): void {
        if (this.snackBarRef) {
            const updatedMessage = this.messageQueue.join('\n');
            this.snackBarRef.dismiss();
            this.snackBarRef = this.snackBar.open(updatedMessage, SNACKBAR_CONFIG.action, {
                duration: SNACKBAR_CONFIG.duration,
            });
        }
    }
}
