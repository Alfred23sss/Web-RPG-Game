import { Router } from '@angular/router';
import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { GameModeService } from '@app/services/game-mode.service';

@Component({
    selector: 'app-pop-up',
    templateUrl: './pop-up.component.html',
    styleUrls: ['./pop-up.component.scss'],
    standalone: true,
    imports: [],
})
export class PopUpComponent {
    isPopupVisible = true;

    isGameSmall = false;
    isGameMedium = false;
    isGameLarge = false;
    // manque logique des boutons !!

    // changer pr que setGame il update un bool et que qd un truc et cliquer il reste highlight et apr confirm change de page
    // CTF mettre unavaible chek dn document cquon doit faire
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

    constructor(
        private dialogRef: MatDialog,
        private router: Router,
    ) {}

    setGameSmall() {
        this.isGameSmall = true;
        this.isGameMedium = false;
        this.isGameLarge = false;
    }
    setGameMedium() {
        this.isGameMedium = true;
        this.isGameSmall = false;
        this.isGameLarge = false;
    }
    setGameLarge() {
        this.isGameLarge = true;
        this.isGameSmall = false;
        this.isGameMedium = false;
    }
    closePopup() {
        this.isGameSmall = false;
        this.isGameMedium = false;
        this.isGameLarge = false;
        this.dialogRef.closeAll();
    }
    setClassicGame() {
        if (this.isGameSmall || this.isGameMedium || this.isGameLarge) {
            this.dialogRef.closeAll();
            this.router.navigate(['/edit']);
        } else {
            alert('Please select game size first!');
        }
    }
    setCTFGame() {
        if (this.isGameSmall || this.isGameMedium || this.isGameLarge) {
            this.dialogRef.closeAll();
            this.router.navigate(['/edit']);
        } else {
            alert('Please select game size first!');
        }
    }

    selectGameMode(gameMode: string) {
        this.gameModeService.setGameMode(gameMode);
        this.closePopupAndSaveGameChoice();
    }

    closePopupAndSaveGameChoice() {
        this.dialogRef.closeAll();
    }
}
