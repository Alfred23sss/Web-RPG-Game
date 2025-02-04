/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridComponent } from '@app/components/grid/grid.component';
import { ItemBarComponent } from '@app/components/item-bar/item-bar.component';
import { ToolbarComponent } from '@app/components/toolbar/toolbar.component';
import { Game } from '@app/interfaces/game';
import { GameValidationService } from '@app/services/game-validation/game-validation.service';
import { GameService } from '@app/services/game/game.service';
import { ScreenshotService } from '@app/services/generate-screenshots/generate-screenshots.service';
import { GridService } from '@app/services/grid/grid-service.service';

@Component({
    selector: 'app-edition-page',
    standalone: true,
    templateUrl: './edition-page.component.html',
    styleUrls: ['./edition-page.component.scss'],
    imports: [CommonModule, FormsModule, GridComponent, ToolbarComponent, ItemBarComponent],
})
export class EditionPageComponent implements OnInit {
    gameName: string = '';
    gameDescription: string = '';
    tempGame: Game;
    private originalGame: Game;

    constructor(
        private gameService: GameService,
        private gridService: GridService,
        // private snackBar: MatSnackBar,
        private screenShotService: ScreenshotService,
        private gameValidationService: GameValidationService,
    ) {}

    ngOnInit() {
        // changer possiblement pour og game pr garder logique
        this.gameService.fetchGames().subscribe();
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.tempGame = JSON.parse(JSON.stringify(currentGame));
            this.originalGame = JSON.parse(JSON.stringify(currentGame));
            this.gridService.setGrid(this.tempGame?.grid);
            this.gameName = this.tempGame.name;
            this.gameDescription = this.tempGame.description;
        }
    }

    reset() {
        // manque logique des objets
        this.gameService.updateCurrentGame(this.originalGame);
        this.gameService.saveGame(this.originalGame);
        window.location.reload();
    }

    async save() {
        // SAVE ITEMS
        // manque logique des contraintes de save
        // mettre toute la validation focntion separe dans une fonction appeler ici qui return si pas valider sinon fait les saves
        
        if (!this.gameValidationService.isHalfTerrain(this.tempGame)) {
            return;
        }
        if (!this.saveTitleAndDescription()) return;

        if (!this.gameValidationService.isDoorPositionValid(this.tempGame)) return;

        if(!this.gameValidationService.isAllTerrainAccessible(this.tempGame)) return;

        if(!this.gameValidationService.isItemValid(this.tempGame)) return;

        await this.savePreviewImage();
        this.gameService.updateCurrentGame(this.tempGame);
        this.gameService.saveGame(this.tempGame);
        // route vers admin, mettre snackbar, saving ... until le save est fini
    }

    private async savePreviewImage() {
        try {
            const previewUrl = await this.screenShotService.generatePreview('game-preview');
            this.tempGame.previewImage = previewUrl;
            console.log('saved');
        } catch (error) {
            console.error('Erreur lors de la capture:', error);
        }
    }

    private saveTitleAndDescription(): boolean {
        if (this.gameValidationService.isTitleAndDescriptionValid(this.gameName, this.gameDescription)) {
            this.tempGame.name = this.gameName;
            this.tempGame.description = this.gameDescription;
            return true;
        }

        return false;
    }
}
