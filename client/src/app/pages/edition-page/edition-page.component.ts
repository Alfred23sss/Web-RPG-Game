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
    originalGame: Game;

    constructor(
        private gameService: GameService,
        private gridService: GridService,
        private screenShotService: ScreenshotService,
        private gameValidationService: GameValidationService,
    ) {}

    ngOnInit() {
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
        this.gameService.updateCurrentGame(this.originalGame);
        this.gameService.saveGame(this.originalGame);
        window.location.reload();
    }

    async save() {
        this.tempGame.name = this.gameName;
        this.tempGame.description = this.gameDescription;

        if (!this.gameValidationService.validateGame(this.tempGame)) {
            return;
        }

        await this.savePreviewImage();
        this.gameService.updateCurrentGame(this.tempGame);
        this.gameService.saveGame(this.tempGame);
    }

    private async savePreviewImage() {
        try {
            const previewUrl = await this.screenShotService.generatePreview('game-preview');
            this.tempGame.previewImage = previewUrl;
            console.log('saved');
        } catch (error) {
            console.error('Error when saving:', error);
        }
    }
}
