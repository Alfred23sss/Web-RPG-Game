/* eslint-disable max-params */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GridComponent } from '@app/components/grid/grid.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';

@Component({
    selector: 'app-game-page',
    standalone: true,
    templateUrl: './game-page.component.html',
    styleUrls: ['./game-page.component.scss'],
    imports: [CommonModule, GridComponent],
})
export class GamePageComponent {
    gameName: string = '';
    gameDescription: string = '';
    game: Game | undefined;

    constructor(
        private gameService: GameService,
        private gridService: GridService,
    ) {}

    ngOnInit(): void {
        this.gameService.fetchGames().subscribe();
        this.game = this.gameService.getCurrentGame();
    }
}
