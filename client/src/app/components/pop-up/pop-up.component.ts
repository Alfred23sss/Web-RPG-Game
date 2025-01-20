import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GameModeService } from '@app/services/game-mode.service';
import { Game, GameService } from '@app/services/game.service';

@Component({
    selector: 'app-pop-up',
    templateUrl: './pop-up.component.html',
    styleUrls: ['./pop-up.component.scss'],
    standalone: true,
})
export class PopUpComponent {
    constructor(
        private dialogRef: MatDialog,
        public gameModeService: GameModeService,
        private gameService: GameService,
        private router: Router,
    ) {}

    setGameSize(size: string) {
        this.gameModeService.setGameSize(size);
    }

    setGameType(mode: string) {
        this.gameModeService.setGameMode(mode);
        if (this.gameModeService.getGameMode() === 'ctf') {
            alert('CTF gamemode is currently unavailable!');
            this.gameModeService.setGameMode('');
        }
    }

    confirm() {
        const gameSize = this.gameModeService.getGameSize();
        const gameMode = this.gameModeService.getGameMode();

        if (gameSize && gameMode) {
            const newGame: Game = {
                name: `NewGame_${Date.now()}`,
                size: gameSize === 'small' ? '10x10' : gameSize === 'medium' ? '15x15' : '20x20',
                mode: gameMode,
                lastModified: new Date(),
                isVisible: true,
                previewImage: 'assets/images/example.png',
                description: `A ${gameMode} game on a ${gameSize} map.`,
            };

            this.gameService.addGame(newGame);
            this.closePopup();
            this.router.navigate(['/edit']);
        } else {
            alert('Please select both game size and game type!');
        }
    }

    closePopup() {
        this.resetSelections();
        this.dialogRef.closeAll();
    }

    private resetSelections() {
        this.gameModeService.setGameMode('');
        this.gameModeService.setGameSize('');
    }
}
