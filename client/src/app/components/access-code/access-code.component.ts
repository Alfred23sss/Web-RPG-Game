import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { RoomValidationService } from '@app/services/room-validation.service';

@Component({
    selector: 'app-access-code',
    templateUrl: './access-code.component.html',
    styleUrls: ['./access-code.component.scss'],
    imports: [FormsModule],
})
export class AccessCodeComponent {
    accessCode: string = '';
    constructor(
        public dialogRef: MatDialogRef<AccessCodeComponent>,
        private dialog: MatDialog,
        private readonly roomValidation: RoomValidationService,
    ) {}

    closeDialog() {
        this.dialogRef.close();
    }

    submitCode(): void {
        console.log('alfred le magnifique');
        this.roomValidation.validateCode(this.accessCode);
        console.log('alfred le magnifique');
        this.closeDialog();
        console.log('alfred le magnifique');
        this.dialog.open(CharacterFormComponent, undefined);
    }
}
