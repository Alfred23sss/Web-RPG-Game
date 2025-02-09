import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

@Component({
    selector: 'app-confirm',
    templateUrl: './confirm.component.html',
    styleUrls: ['./confirm.component.scss'],
})
export class ConfirmComponent {
    constructor(
        private snackBarRef: MatSnackBarRef<ConfirmComponent>,
        @Inject(MAT_SNACK_BAR_DATA) public data: { message: string },
    ) {}

    onYesClick() {
        this.snackBarRef.dismissWithAction();
    }

    onNoClick() {
        this.snackBarRef.dismiss();
    }
}
