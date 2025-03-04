import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { Lobby } from '@app/interfaces/lobby';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
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
    accessCodes: string[];
    constructor(
        public dialogRef: MatDialogRef<AccessCodeComponent>,
        private dialog: MatDialog,
        private readonly accessCodeCommunicationService: AccessCodesCommunicationService,
        private readonly snackbarService: SnackbarService,
        private readonly accessCodeService: AccessCodeService,
    ) {
        this.accessCodeCommunicationService.getAllAccessCodes().subscribe({
            next: (response: string[]) => {
                console.log('Access codes received:', response);
                this.accessCodes = response;
            },
            error: (err) => {
                console.error('Error fetching access codes:', err);
            },
        });
    }

    closeDialog() {
        this.dialogRef.close();
    }

    submitCode(): void {
        this.validateAccessCode()
            .then(async () => this.fetchLobbyData())
            .then((lobby) => this.openCharacterForm(lobby))
            .catch((err) => {
                this.snackbarService.showMessage(err.message || "Une erreur s'est produite.");
            });
    }

    private async validateAccessCode(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.accessCodeCommunicationService.validateAccessCode(this.accessCode).subscribe({
                next: (response: { isValid: boolean }) => {
                    if (response.isValid) {
                        resolve();
                    } else {
                        reject(new Error("La partie que vous souhaitez rejoindre n'existe pas!"));
                    }
                },
            });
        });
    }

    private async fetchLobbyData(): Promise<Lobby> {
        return this.accessCodeService.getLobbyData(this.accessCode).then((lobby) => {
            if (!lobby || !lobby.game) {
                throw new Error('Impossible de récupérer la partie.');
            }
            return lobby;
        });
    }

    private openCharacterForm(lobby: Lobby): void {
        this.closeDialog();
        this.dialog.open(CharacterFormComponent, {
            data: {
                accessCode: this.accessCode,
                isLobbyCreated: this.isLobbyCreated,
                game: lobby.game,
            },
        });
    }
}
