import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACKBAR_CONFIG } from '../../constants/global.constants';

@Injectable({
    providedIn: 'root',
})
export class SnackbarService {
    constructor(private snackBar: MatSnackBar) {}

    showMessage(message: string, action: string = SNACKBAR_CONFIG.ACTION, duration: number = SNACKBAR_CONFIG.DURATION): void {
        this.snackBar.open(message, action, { duration });
    }
}
