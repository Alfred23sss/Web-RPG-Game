import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';

@Component({
    selector: 'app-access-code',
    templateUrl: './access-code.component.html',
    styleUrls: ['./access-code.component.scss'],
    standalone: true,
    imports: [FormsModule],
})
export class AccessCodeComponent {
    accessCode: string = '';
    isLobbyCreated: boolean = true;
    constructor(
        public dialogRef: MatDialogRef<AccessCodeComponent>,
        private dialog: MatDialog,
        private readonly accessCodeService: AccessCodesCommunicationService,
        private readonly snackbarService: SnackbarService,
    ) {}

    closeDialog() {
        this.dialogRef.close();
    }

    submitCode(): void {
        if (this.accessCodeService.validateAccessCode(this.accessCode)) {
            this.closeDialog();
            this.dialog.open(CharacterFormComponent, {
                data: { accessCode: this.accessCode, isLobbyCreated: this.isLobbyCreated },
            });
        } else {
            this.snackbarService.showMessage("La partie que vous souhaitez rejoindre n'existe pas!");
        }
    }
}
