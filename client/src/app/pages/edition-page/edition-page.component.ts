/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridComponent } from '@app/components/grid/grid.component';
import { ItemBarComponent } from '@app/components/item-bar/item-bar.component';
import { ToolbarComponent } from '@app/components/toolbar/toolbar.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';

@Component({
    selector: 'app-edition-page',
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

    save() {
        // manque logique des contraintes de save
        this.tempGame.name = this.gameName;
        this.tempGame.description = this.gameDescription;
        this.gameService.updateCurrentGame(this.tempGame);
        this.gameService.saveGame(this.tempGame);
        window.location.reload();
    }

    empty() {
        // empty
    }
}
