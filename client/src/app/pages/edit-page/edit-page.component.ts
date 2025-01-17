import { Component, OnInit } from '@angular/core';
import { GameModeService } from '@app/services/game-mode.service';

@Component({
    selector: 'app-edit-page',
    templateUrl: './edit-page.component.html',
    styleUrls: ['./edit-page.component.scss'],
    imports: [],
})
export class EditPageComponent implements OnInit {
    selectedGameMode: string = '';

    constructor(private gameModeService: GameModeService) {}

    ngOnInit() {
        this.selectedGameMode = this.gameModeService.getGameMode();
    }
}
