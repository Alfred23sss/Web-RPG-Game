import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GridComponent } from '@app/components/grid/grid.component';
import { ItemBarComponent } from '@app/components/item-bar/item-bar.component';
import { ToolbarComponent } from '@app/components/toolbar/toolbar.component';
import { Game } from '@app/interfaces/game';
import { GameValidationService } from '@app/services/game-validation/game-validation.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { ItemService } from '@app/services/item/item.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';

@Component({
    selector: 'app-edition-page',
    standalone: true,
    templateUrl: './edition-page.component.html',
    styleUrls: ['./edition-page.component.scss'],
    imports: [CommonModule, FormsModule, GridComponent, ToolbarComponent, ItemBarComponent],
})
export class EditionPageComponent implements OnInit, AfterViewInit {
    @ViewChild(ItemBarComponent) itemBar!: ItemBarComponent;
    gameName: string = '';
    gameDescription: string = '';
    game: Game;
    isSaving: boolean = false;
    originalGame: Game;
    originalItemBar: string;

    constructor(
        private gameService: GameService,
        private gridService: GridService,
        private gameValidationService: GameValidationService,
        private router: Router,
        private snackbarService: SnackbarService,
        private itemService: ItemService,
    ) {}

    ngOnInit() {
        this.gameService.fetchGames().subscribe();
        this.cloneInitialGame();
    }

    ngAfterViewInit() {
        setTimeout(() => {
            if (this.itemBar && this.itemBar.items) {
                this.originalItemBar = JSON.stringify(this.itemBar.items);
                this.itemService.setItems(this.itemBar.items);
            }
        }, 0);
    }

    cloneInitialGame() {
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.game = JSON.parse(JSON.stringify(currentGame));
            this.originalGame = JSON.parse(JSON.stringify(currentGame));
            this.gridService.setGrid(this.game?.grid);
            this.updateGameAndDescription();
        }
    }

    backToAdmin() {
        this.snackbarService.showConfirmation('Are you sure ? Changes will not be saved!').subscribe((confirmed) => {
            if (confirmed) {
                this.router.navigate(['/admin']);
            }
        });
    }

    reset() {
        this.game = JSON.parse(JSON.stringify(this.originalGame));
        this.updateGameAndDescription();
        this.gridService.setGrid(this.game.grid);
        this.gameService.updateCurrentGame(this.game);
        this.gameService.saveGame(this.game);
        if (this.itemBar) {
            const restoredItems = JSON.parse(this.originalItemBar);
            this.itemService.setItems(restoredItems);
            this.itemBar.items = this.itemService.getItems();
        }
        this.cloneInitialGame();
    }

    async save() {
        if (this.isSaving) return;
        this.isSaving = true;
        this.game.name = this.gameName;
        this.game.description = this.gameDescription;

        if (!this.gameValidationService.validateGame(this.game)) {
            this.isSaving = false;
            return;
        }

        await this.savePreviewImage();
        this.gameService.updateCurrentGame(this.game);
        this.gameService.saveGame(this.game);
        this.gameService.fetchGames().subscribe(() => {
            this.router.navigate(['/admin']).then(() => {
                this.isSaving = false;
            });
        });
    }

    private async savePreviewImage() {
        try {
            const previewUrl = await this.gameService.savePreviewImage();
            this.game.previewImage = previewUrl;
        } catch {
            this.isSaving = false;
        }
    }

    private updateGameAndDescription() {
        this.gameName = this.game.name;
        this.gameDescription = this.game.description;
    }
}
