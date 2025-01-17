import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { GameModeService } from '@app/services/game-mode.service';

@Component({
    selector: 'app-pop-up',
    templateUrl: './pop-up.component.html',
    styleUrls: ['./pop-up.component.scss'],
    standalone: true,
    imports: [RouterLink],
})
export class PopUpComponent {
    classicGameModes = [
        { gameMode: 'Classique - Petite (10x10, 2 joueurs, 2 items)' },
        { gameMode: 'Classique - Moyenne (15x15, 2-4 joueurs, 4 items)' },
        { gameMode: 'Classique - Grande (20x20, 2-6 joueurs, 6 items)' },
    ];
    captureTheFlagGameModes = [
        { gameMode: 'CTF - Petite (10x10, 2 joueurs, 2 items)' },
        { gameMode: 'CTF - Moyenne (15x15, 2-4 joueurs, 4 items)' },
        { gameMode: 'CTF - Grande (20x20, 2-6 joueurs, 6 items)' },
    ];
    private gameModeService = inject(GameModeService);
    constructor(private dialogRef: MatDialog) {}

    selectGameMode(gameMode: string) {
        this.gameModeService.setGameMode(gameMode);
        this.closePopupAndSaveGameChoice();
    }

    closePopupAndSaveGameChoice() {
        this.dialogRef.closeAll();
    }
}
