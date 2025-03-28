import { Injectable } from '@angular/core';
import { Player } from '@app/interfaces/player';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ClientNotifierServices {
    logBook: string[] = [];
    logBookUpdated = new Subject<string[]>();
    constructor(private readonly snackbarService: SnackbarService) {}

    addLogbookEntry(entry: string, players?: Player[]): void {
        const formattedTime = this.formatTime(new Date());
        let playerNames = '';
        if (players && players.length > 0) {
            playerNames = ` (Joueurs impliqués : ${players.map((player) => player.name).join(', ')})`;
        }
        const formattedEntry = `[${formattedTime}] - ${entry}${playerNames}`;

        this.logBook.unshift(formattedEntry);

        this.logBookUpdated.next(this.logBook);
    }

    displayMessage(message: string) {
        this.snackbarService.showMessage(message);
    }

    private formatTime(date: Date): string {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
}
