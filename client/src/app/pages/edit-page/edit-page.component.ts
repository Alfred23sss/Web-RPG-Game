import { Component, OnInit } from '@angular/core';
import { GameService } from '@app/services/game.service';

@Component({
    selector: 'app-edit-page',
    templateUrl: './edit-page.component.html',
    styleUrls: ['./edit-page.component.scss'],
    imports: [],
})
export class EditPageComponent implements OnInit {
    selectedGameSize: string = '';
    selectedGameMode: string = '';

    constructor(private gameService: GameService) {}

    ngOnInit() {
        const currentGame = this.gameService.getCurrentGame();
        if (currentGame) {
            this.selectedGameMode = currentGame.mode;
            this.selectedGameSize = currentGame.size;
        }
    }
}
