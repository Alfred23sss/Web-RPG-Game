import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { GAME_MODES_LIST, GAME_SIZES_LIST } from '@app/constants/global.constants';
import { ErrorMessages, Route } from '@app/enums/global.enums';
import { Game, GameMode, GameSize } from '@app/interfaces/game';

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
        private readonly dialogRef: MatDialog,
        private readonly gameModeService: GameModeService,
        private readonly gameService: GameService,
        private readonly router: Router,
        private readonly snackbarService: SnackbarService,
        private readonly gridService: GridService,
    ) {}

    setGameSize(size: GameSize) {
        if (!this.gameModeService.setGameSize(size)) {
            this.snackbarService.showMessage(ErrorMessages.InvalidGameSize);
        }
    }

    setGameType(mode: GameMode) {
        if (Object.values(GameMode).includes(mode)) {
            this.gameModeService.setGameMode(mode);
            if (mode === GameMode.CTF) {
                this.snackbarService.showMessage(ErrorMessages.UnavailableGameMode);
                this.gameModeService.setGameMode(GameMode.None);
            }
        } else {
            this.gameModeService.setGameMode(mode);
        }
    }

    getGameSize(): GameSize | null {
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
            this.snackbarService.showMessage(ErrorMessages.MissingGameDetails);
            return;
        }

        const newGame: Game = this.gameService.createNewGame(gameMode, gridSize);
        this.gameService.updateCurrentGame(newGame);
        this.router.navigate([Route.EditionView]);
        this.closePopup();
    }

    closePopup() {
        this.gameModeService.resetModeAndSize();
        this.dialogRef.closeAll();
    }
}
