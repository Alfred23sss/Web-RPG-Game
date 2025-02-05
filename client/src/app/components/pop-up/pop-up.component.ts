import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Game } from '@app/interfaces/game';
import { GameDecorations } from '@app/interfaces/images';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { ERROR_MESSAGES, GAME_MODES, GAME_SIZES, GRID_DIMENSIONS, ROUTES, GAME_SIZES_LIST, GAME_MODES_LIST} from '@app/constants/global.constants'
import { SnackbarService } from '@app/services/snackbar/snackbar.service';

import { v4 as uuidv4 } from 'uuid';

@Component({
    selector: 'app-pop-up',
    templateUrl: './pop-up.component.html',
    styleUrls: ['./pop-up.component.scss'],
    standalone: true,
})
export class PopUpComponent {
    xSword = GameDecorations.XSwords;
    gameSizes = GAME_SIZES_LIST;
    gameModes = GAME_MODES_LIST;

    // private readonly gameModes = ['Classic', 'CTF'];
    // private readonly gameSizes = {
    //     small: 10,
    //     medium: 15,
    //     large: 20,
    // };

    // eslint-disable-next-line max-params
    constructor(
        private dialogRef: MatDialog,
        public gameModeService: GameModeService,
        private gameService: GameService,
        private router: Router,
        private gridService: GridService,
        // private snackBar: MatSnackBar,
        private snackbarService: SnackbarService,
    ) {}

    setGameSize(size: string) {
        if (this.isValidSize(size)) {
            this.gameModeService.setGameSize(size);
        } else {
            this.showError(ERROR_MESSAGES.INVALID_GAME_SIZE);
        }
    }

    setGameType(mode: string) {
        if (Object.values(GAME_MODES).includes(mode)) {
            this.gameModeService.setGameMode(mode);
            if (mode === GAME_MODES.CTF) {
                this.showError(ERROR_MESSAGES.UNAVAILABLE_GAME_MODE);
                this.gameModeService.setGameMode('');
            }
        } else {
            this.gameModeService.setGameMode(mode);
            console.log(this.gameModeService);
            // this.showError(ERROR_MESSAGES.INVALID_GAME_MODE);
        }
    }

    confirm() {
        const gameSize = this.gameModeService.getGameSize();
        const gameMode = this.gameModeService.getGameMode();
        const gridSize = this.getGridSize(gameSize);

        if (!gameSize || !gameMode) {
            this.showError(ERROR_MESSAGES.MISSING_GAME_DETAILS);
            return;
        }

        const newGame: Game = this.buildNewGame(gameSize, gameMode, gridSize);
        this.gameService.updateCurrentGame(newGame);
        this.closePopup();
        this.router.navigate([ROUTES.EDITION_VIEW]);
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
        this.snackbarService.showMessage(message);
    }

    private isValidSize(size: string): boolean {
        // return Object.keys(this.gameSizes).includes(size);
        return Object.values(GAME_SIZES).includes(size);
    }

    private getGridSize(gameSize: string): number {
        // return this.gameSizes[gameSize as keyof typeof this.gameSizes] || this.gameSizes.small;
        return GRID_DIMENSIONS[gameSize as keyof typeof GRID_DIMENSIONS] || GRID_DIMENSIONS[GAME_SIZES.SMALL];
    }

    private buildNewGame(gameSize: string, gameMode: string, gridSize: number): Game {
        return {
            id: uuidv4(),
            name: '',
            size: gridSize.toString(),
            //size: this.gameSizes[gameSize as keyof typeof this.gameSizes].toString(),
            mode: gameMode,
            lastModified: new Date(),
            isVisible: true,
            previewImage: '',
            description: '',
            grid: this.gridService.createGrid(gridSize, gridSize),
        };
    }
}
