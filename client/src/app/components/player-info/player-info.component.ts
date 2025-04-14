import { Component, OnDestroy } from '@angular/core';
import { GameData } from '@app/classes/game-data/game-data';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-player-info',
    imports: [],
    templateUrl: './player-info.component.html',
    styleUrl: './player-info.component.scss',
})
export class PlayerInfoComponent implements OnDestroy {
    gameData: GameData = new GameData();
    private gameDataSubscription: Subscription;

    constructor(private readonly gameStateSocketService: GameStateSocketService) {
        this.gameDataSubscription = this.gameStateSocketService.gameData$.subscribe((data) => {
            this.gameData = data;
        });
    }

    ngOnDestroy(): void {
        if (this.gameDataSubscription) this.gameDataSubscription.unsubscribe();
    }
}
