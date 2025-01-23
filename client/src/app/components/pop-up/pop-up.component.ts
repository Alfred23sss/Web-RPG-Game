import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Game } from '@app/interfaces/game';
import { GameModeService } from '@app/services/game-mode.service';
import { GameService } from '@app/services/game.service';
import { GridService } from '@app/services/grid-service.service';

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
        private gridService: GridService,
    ) {}

    setGameSize(size: string) {
        this.gameModeService.setGameSize(size);
    }

    setGameType(mode: string) {
        this.gameModeService.setGameMode(mode);
        if (this.gameModeService.getGameMode() === 'CTF') {
            alert('CTF gamemode is currently unavailable!');
            this.gameModeService.setGameMode('');
        }
    }

    confirm() {
        const gameSize = this.gameModeService.getGameSize();
        const gameMode = this.gameModeService.getGameMode();
        const secondDivider = 1000;
        const secondModulo = 60;
        const small = 10;
        const medium = 15;
        const large = 20;
        const gridSize = gameSize === 'small' ? small : gameSize === 'medium' ? medium : large;
        if (gameSize && gameMode) {
            const newGame: Game = {
                name: `NewGame_${Math.floor(Date.now() / secondDivider) % secondModulo}`,
                size: gameSize === 'small' ? '10' : gameSize === 'medium' ? '15' : '20',
                mode: gameMode,
                lastModified: new Date(),
                isVisible: true,
                previewImage: 'assets/images/example.png',
                description: `A ${gameMode} game on a ${gameSize} map.`,
                grid: this.gridService.createGrid(gridSize, gridSize),
            };

            this.gridService.setGrid(newGame.grid);
            this.gameService.updateCurrentGame(newGame);
            this.gameService.addGame(newGame);
            this.closePopup();
            this.router.navigate(['/edition']);
        } else {
            alert('Please select both game size and game type!');
        }
    }

    closePopup() {
        this.resetSelections();
        this.dialogRef.closeAll();
    }

    confirmPopup() {
        this.resetSelections();
        this.dialogRef.closeAll();
    }
    private resetSelections() {
        this.gameModeService.setGameMode('');
        this.gameModeService.setGameSize('');
    }
}
