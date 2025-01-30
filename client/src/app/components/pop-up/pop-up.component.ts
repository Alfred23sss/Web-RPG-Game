import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Game } from '@app/interfaces/game';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
    selector: 'app-pop-up',
    templateUrl: './pop-up.component.html',
    styleUrls: ['./pop-up.component.scss'],
    standalone: true,
})
export class PopUpComponent {
    private readonly gameModes = ['Classic', 'CTF'];
    private readonly gameSizes = {
        small: 10,
        medium: 15,
        large: 20,
    };

    // eslint-disable-next-line max-params
    constructor(
        private dialogRef: MatDialog,
        public gameModeService: GameModeService,
        private gameService: GameService,
        private router: Router,
        private gridService: GridService,
        private snackBar: MatSnackBar,
    ) {}

    setGameSize(size: string) {
        if (this.isValidSize(size)) {
            this.gameModeService.setGameSize(size);
        } else {
            this.showError('Invalid game size selected!');
        }
    }

    setGameType(mode: string) {
        if (this.gameModes.includes(mode)) {
            this.gameModeService.setGameMode(mode);
            if (mode === 'CTF') {
                this.showError('CTF gamemode is currently unavailable!');
                this.gameModeService.setGameMode('');
            }
        } else {
            this.showError('Invalid game mode selected!');
        }
    }

    confirm() {
        const gameSize = this.gameModeService.getGameSize();
        const gameMode = this.gameModeService.getGameMode();
        const gridSize = this.getGridSize(gameSize); // change!!!!!!!!!!!!!!!!!!!!!11

        if (!gameSize || !gameMode) {
            this.showError('Please select both game size and game type!');
            return;
        }

        const newGame: Game = this.buildNewGame(gameSize, gameMode, gridSize);
        this.gameService.updateCurrentGame(newGame);
        this.closePopup();
        this.router.navigate(['/edition']);
    }

    closePopup() {
        this.resetSelections();
        this.dialogRef.closeAll();
    }

    private resetSelections() {
        this.gameModeService.setGameMode('');
        this.gameModeService.setGameSize('');
    }

    private showError(message: string) {
        this.snackBar.open(message, 'Close', { duration: 3000 });
    }

    private isValidSize(size: string): boolean {
        return Object.keys(this.gameSizes).includes(size);
    }

    private getGridSize(gameSize: 'small' | 'medium' | 'large'): number {
        return this.gameSizes[gameSize] || this.gameSizes.small;
    }

    private buildNewGame(gameSize: string, gameMode: string, gridSize: number): Game {
        return {
            id: uuidv4(),
            name: '',
            size: this.gameSizes[gameSize as keyof typeof this.gameSizes].toString(),
            mode: gameMode,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'assets/images/example.png',
            description: `A ${gameMode} game on a ${gameSize} map.`,
            grid: this.gridService.createGrid(gridSize, gridSize),
        };
    }
}
