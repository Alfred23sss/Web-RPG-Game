import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Game } from '@app/interfaces/game';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { v4 as uuidv4 } from 'uuid';
import {
    DEFAULT_GAME_IMAGE,
    ERROR_MESSAGES,
    GAME_MODES,
    GAME_MODES_LIST,
    GAME_SIZES_LIST,
    GRID_DIMENSIONS,
    ROUTES,
    TIME_CONSTANTS,
} from '@app/constants/global.constants';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { GameDecorations } from '@app/interfaces/images';

@Component({
    selector: 'app-pop-up',
    templateUrl: './pop-up.component.html',
    styleUrls: ['./pop-up.component.scss'],
    standalone: true,
})
export class PopUpComponent {
    gameSizes = GAME_SIZES_LIST;
    gameModes = GAME_MODES_LIST;
    xSword: GameDecorations.XSwords;
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
        private snackbarService: SnackbarService,
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
        this.gameModeService.setGameMode(mode);
        if (this.gameModeService.getGameMode() === GAME_MODES.CTF) {
            this.snackbarService.showMessage(ERROR_MESSAGES.UNAVAILABLE_GAMEMODE);
            this.gameModeService.setGameMode('');
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
        if (gameSize && gameMode) {
            const gridSize = GRID_DIMENSIONS[gameSize];
            const newGame: Game = {
                id: uuidv4(), // verify if creation ok, maybe need specific function for id creation
                name: `NewGame_${Math.floor(Date.now() / TIME_CONSTANTS.SECOND_DIVIDER) % TIME_CONSTANTS.SECOND_MODULO}`,
                size: GRID_DIMENSIONS[gameSize].toString(),
                mode: gameMode,
                lastModified: new Date(),
                isVisible: true,
                previewImage: DEFAULT_GAME_IMAGE,
                description: `A ${gameMode} game on a ${gameSize} map.`,
                grid: this.gridService.createGrid(gridSize, gridSize),
            };

            // this.gridService.setGrid(newGame.grid);
            // this.gameService.addGame(newGame);
            this.gameService.updateCurrentGame(newGame);
            this.closePopup();
            this.router.navigate([ROUTES.EDITION_VIEW]);
        } else {
            this.snackbarService.showMessage(ERROR_MESSAGES.MISSING_GAME_DETAILS);
        }
        const gridSize = this.getGridSize(gameSize);

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

    // confirmPopup() {
    //     this.resetSelections();
    //     this.dialogRef.closeAll();
    // }

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

    private getGridSize(gameSize: string): number {
        return this.gameSizes[gameSize as keyof typeof this.gameSizes] || this.gameSizes.small;
    }

    private buildNewGame(gameSize: string, gameMode: string, gridSize: number): Game {
        return {
            id: uuidv4(),
            name: '',
            size: this.gameSizes[gameSize as keyof typeof this.gameSizes].toString(),
            mode: gameMode,
            lastModified: new Date(),
            isVisible: true,
            previewImage: '',
            description: '',
            grid: this.gridService.createGrid(gridSize, gridSize),
        };
    }
}
