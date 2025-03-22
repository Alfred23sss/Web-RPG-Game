import { Component, OnDestroy } from '@angular/core';
import { GameData } from '@app/classes/gameData';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
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

    constructor(private readonly gameSocketService: GameSocketService) {
        this.gameDataSubscription = this.gameSocketService.gameData$.subscribe((data) => {
            this.gameData = data;
        });
    }

    ngOnDestroy(): void {
        if (this.gameDataSubscription) this.gameDataSubscription.unsubscribe();
    }
}
