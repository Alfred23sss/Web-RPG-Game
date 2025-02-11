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
        private gameModeService: GameModeService,
        private gameService: GameService,
        private router: Router,
        private snackbarService: SnackbarService,
        private gridService: GridService,
    ) {}

    setGameSize(size: string) {
        if (!this.gameModeService.setGameSize(size)) {
            this.snackbarService.showMessage(ERROR_MESSAGES.invalidGameSize);
        }
    }

    setGameType(mode: string) {
        if (Object.values(GAME_MODES).includes(mode)) {
            this.gameModeService.setGameMode(mode);
            if (mode === GAME_MODES.ctf) {
                this.snackbarService.showMessage(ERROR_MESSAGES.unavailableGameMode);
                this.gameModeService.setGameMode('');
            }
        } else {
            this.gameModeService.setGameMode(mode);
        }
    }

    getGameSize() {
        return this.gameModeService.getGameSize();
    }

    getGameMode() {
        return this.gameModeService.getGameMode();
    }

    confirm() {
        const gameSize = this.gameModeService.getGameSize();
        const gameMode = this.gameModeService.getGameMode();
        const gridSize = this.gridService.getGridSize(gameSize);

        if (!gameSize || !gameMode) {
            this.snackbarService.showMessage(ERROR_MESSAGES.missingGameDetails);
            return;
        }

        const newGame: Game = this.gameService.createNewGame(gameMode, gridSize);
        this.gameService.updateCurrentGame(newGame);
        this.router.navigate([ROUTES.editionView]);
        this.closePopup();
    }

    closePopup() {
        this.gameModeService.resetModeAndSize();
        this.dialogRef.closeAll();
    }
}
