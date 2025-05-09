import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Item } from '@app/classes/item/item';
import { GridComponent } from '@app/components/grid/grid.component';
import { ItemBarComponent } from '@app/components/item-bar/item-bar.component';
import { ToolbarComponent } from '@app/components/toolbar/toolbar.component';
import { Routes } from '@common/enums';
import { Game } from '@app/interfaces/game';
import { GameValidationService } from '@app/services/game-validation/game-validation.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { ItemService } from '@app/services/item/item.service';

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
    originalItemBar: Item[];

    constructor(
        private gameService: GameService,
        private gridService: GridService,
        private gameValidationService: GameValidationService,
        private router: Router,
        private itemService: ItemService,
    ) {}

    ngOnInit(): void {
        this.gameService.fetchGames().subscribe();
        this.cloneInitialGame();
    }

    ngAfterViewInit(): void {
        if (this.itemBar && this.itemBar.items) {
            this.originalItemBar = this.makeDeepCopy(this.itemBar.items);
            const gameMode = this.gameService.getCurrentGame()?.mode;
            this.itemService.setItems(this.itemBar.items, gameMode);
            this.itemBar.items = this.itemService.getItems();
        }
    }

    backToAdmin(): void {
        this.router.navigate([Routes.AdminPage]);
    }

    reset(): void {
        this.game = this.makeDeepCopy(this.originalGame);
        this.updateGameAndDescription();
        this.gridService.setGrid(this.game.grid);
        this.gameService.updateCurrentGame(this.game);
        if (this.itemBar) {
            const restoredItems = this.makeDeepCopy(this.originalItemBar);
            const gameMode = this.gameService.getCurrentGame()?.mode;
            this.itemService.setItems(restoredItems, gameMode);
            this.itemBar.items = this.itemService.getItems();
        }
        this.cloneInitialGame();
    }

    async save(): Promise<void> {
        if (this.isSaving) return;
        this.isSaving = true;
        this.game.name = this.gameName;
        this.game.description = this.gameDescription;

        if (!this.gameValidationService.validateGame(this.game)) {
            this.isSaving = false;
            return;
        }

        await this.savePreviewImage();
        this.updateGame();
        this.gameService.fetchGames().subscribe(() => {
            this.router.navigate([Routes.AdminPage]).then(() => {
                this.isSaving = false;
            });
        });
    }

    private async savePreviewImage(): Promise<void> {
        try {
            const previewUrl = await this.gameService.savePreviewImage();
            this.game.previewImage = previewUrl;
        } catch {
            this.isSaving = false;
        }
    }

    private updateGameAndDescription(): void {
        this.gameName = this.game.name;
        this.gameDescription = this.game.description;
    }

    private updateGame(): void {
        this.gameService.updateCurrentGame(this.game);
        this.gameService.saveGame(this.game);
    }

    private makeDeepCopy(toCopy: string | Game | Item[]) {
        return JSON.parse(JSON.stringify(toCopy));
    }

    private cloneInitialGame(): void {
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.game = this.makeDeepCopy(currentGame);
            this.originalGame = this.makeDeepCopy(currentGame);
            this.gridService.setGrid(this.game?.grid);
            this.updateGameAndDescription();
        }
    }
}
