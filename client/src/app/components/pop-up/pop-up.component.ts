import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ERROR_MESSAGES, GAME_MODES, GAME_MODES_LIST, GAME_SIZES_LIST, ROUTES } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { GameDecorations } from '@app/interfaces/images';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
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

    // eslint-disable-next-line max-params
    constructor(
        private dialogRef: MatDialog,
        public gameModeService: GameModeService,
        private gameService: GameService,
        private router: Router,
        private snackbarService: SnackbarService,
        private gridService: GridService,
    ) {}

    setGameSize(size: string) {
        if (!this.gameModeService.setGameSize(size)) {
            this.snackbarService.showMessage(ERROR_MESSAGES.INVALID_GAME_SIZE);
        }
    }

    setGameType(mode: string) {
        if (Object.values(GAME_MODES).includes(mode)) {
            this.gameModeService.setGameMode(mode);
            if (mode === GAME_MODES.CTF) {
                this.snackbarService.showMessage(ERROR_MESSAGES.UNAVAILABLE_GAME_MODE);
                this.gameModeService.setGameMode('');
            }
        } else {
            this.gameModeService.setGameMode(mode);
        }
    }

    confirm() {
        const gameSize = this.gameModeService.getGameSize();
        const gameMode = this.gameModeService.getGameMode();
        const gridSize = this.gridService.getGridSize(gameSize);

        if (!gameSize || !gameMode) {
            this.snackbarService.showMessage(ERROR_MESSAGES.MISSING_GAME_DETAILS);
            return;
        }

        const newGame: Game = this.gameService.createNewGame(gameSize, gameMode, gridSize);
        this.gameService.updateCurrentGame(newGame);
        this.router.navigate([ROUTES.EDITION_VIEW]);
        this.closePopup();
    }

    closePopup() {
        this.gameModeService.resetModeAndSize();
        this.dialogRef.closeAll();
    }
}
