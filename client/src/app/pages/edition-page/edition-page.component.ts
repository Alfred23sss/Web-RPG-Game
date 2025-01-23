/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridComponent } from '@app/components/grid/grid.component';
import { ToolbarComponent } from '@app/components/toolbar/toolbar.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game.service';

@Component({
    selector: 'app-edition-page',
    templateUrl: './edition-page.component.html',
    styleUrls: ['./edition-page.component.scss'],
    imports: [CommonModule, FormsModule, GridComponent, ToolbarComponent],
})
export class EditionPageComponent implements OnInit {
    activeTool: string | null = null;
    isDragging = false;
    activeToolImage: string = '';
    gameName: string = '';
    gameDescription: string = '';
    selectedGameSize: string = '';
    selectedGameMode: string = '';
    game: Game | undefined;

    constructor(private gameService: GameService) {
        this.game = this.gameService.getCurrentGame();
    }

    ngOnInit() {
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.selectedGameMode = currentGame.mode;
            this.selectedGameSize = currentGame.size;
        }
    }
}
