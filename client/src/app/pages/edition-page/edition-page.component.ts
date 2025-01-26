/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridComponent } from '@app/components/grid/grid.component';
import { ToolbarComponent } from '@app/components/toolbar/toolbar.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game.service';
import { GridService } from '@app/services/grid-service.service';
@Component({
    selector: 'app-edition-page',
    templateUrl: './edition-page.component.html',
    styleUrls: ['./edition-page.component.scss'],
    imports: [CommonModule, FormsModule, GridComponent, ToolbarComponent],
})
export class EditionPageComponent implements OnInit {
    gameName: string = '';
    gameDescription: string = '';
    selectedGameSize: string = '';
    selectedGameMode: string = '';
    game: Game | undefined;
    tempGame: Game | undefined;
    private originalGame: Game | undefined;

    constructor(
        private gameService: GameService,
        private gridService: GridService,
    ) {
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.tempGame = JSON.parse(JSON.stringify(currentGame));
            this.originalGame = JSON.parse(JSON.stringify(currentGame));
            this.gridService.setGrid(this.tempGame?.grid);
        } else {
            this.originalGame = undefined;
        }
    }

    ngOnInit() {
        // changer possiblement pour og game pr garder logique
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.selectedGameMode = currentGame.mode;
            this.selectedGameSize = currentGame.size;
        }
    }

    reset() {
        // a finir apres persistance etablie
        this.gameService.updateCurrentGame(this.originalGame);
        // this.cdr.detectChanges();
        // window.location.reload();
    }

    save() {
        // manque logique des contraintes de save
        this.gameService.updateCurrentGame(this.tempGame);
    }

    empty() {
        // empty
    }
}
