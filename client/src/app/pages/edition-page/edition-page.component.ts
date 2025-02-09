import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
    game: Game;
    originalGame: Game;

    constructor(
        private gameService: GameService,
        private gridService: GridService,
        private screenShotService: ScreenshotService,
        private gameValidationService: GameValidationService,
        private router: Router,
    ) {}

    ngOnInit() {
        this.gameService.fetchGames().subscribe();
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.game = JSON.parse(JSON.stringify(currentGame));
            this.originalGame = JSON.parse(JSON.stringify(currentGame));
            this.gridService.setGrid(this.game?.grid);
            this.gameName = this.game.name;
            this.gameDescription = this.game.description;
        }
    }
    cancel() {
        this.router.navigate(['/admin']);
    }

    reset() {
        this.game = JSON.parse(JSON.stringify(this.originalGame));
        this.gameName = this.game.name;
        this.gameDescription = this.game.description;
        this.gridService.setGrid(this.game.grid);
        this.gameService.updateCurrentGame(this.game);
        this.gameService.saveGame(this.game);
    }

    async save() {
        this.game.name = this.gameName;
        this.game.description = this.gameDescription;

        if (!this.gameValidationService.validateGame(this.game)) {
            return;
        }

        await this.savePreviewImage();
        this.gameService.updateCurrentGame(this.game);
        this.gameService.saveGame(this.game);
        this.router.navigate(['/admin']);
    }

    private async savePreviewImage() {
        try {
            const previewUrl = await this.screenShotService.generatePreview('game-preview');
            this.game.previewImage = previewUrl;
        } catch (error) {
            console.error('Error when saving:', error);
        }
    }
}
