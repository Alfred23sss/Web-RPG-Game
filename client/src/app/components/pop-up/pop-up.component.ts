import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
} from '../../constants/global.constants';
import { SnackbarService } from '../../services/snackbar/snackbar.service';

@Component({
    selector: 'app-pop-up',
    templateUrl: './pop-up.component.html',
    styleUrls: ['./pop-up.component.scss'],
    standalone: true,
})
export class PopUpComponent {
    gameSizes = GAME_SIZES_LIST;
    gameModes = GAME_MODES_LIST;
    constructor(
        private dialogRef: MatDialog,
        public gameModeService: GameModeService,
        private gameService: GameService,
        private router: Router,
        private gridService: GridService,
        private snackbarService: SnackbarService,
    ) {}

    setGameSize(size: string) {
        this.gameModeService.setGameSize(size);
    }

    setGameType(mode: string) {
        this.gameModeService.setGameMode(mode);
        if (this.gameModeService.getGameMode() === GAME_MODES.CTF) {
            this.snackbarService.showMessage(ERROR_MESSAGES.UNAVAILABLE_GAMEMODE);
            this.gameModeService.setGameMode('');
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
}
