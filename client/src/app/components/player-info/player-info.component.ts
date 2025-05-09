import { Component, OnDestroy } from '@angular/core';
import { GameData } from '@app/classes/game-data/game-data';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { DiceType, ItemName } from '@common/enums';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-player-info',
    imports: [],
    templateUrl: './player-info.component.html',
    styleUrl: './player-info.component.scss',
})
export class PlayerInfoComponent implements OnDestroy {
    gameData: GameData = new GameData();
    diceType = DiceType;
    private gameDataSubscription: Subscription;

    constructor(private readonly gameStateSocketService: GameStateSocketService) {
        this.gameDataSubscription = this.gameStateSocketService.gameData$.subscribe((data) => {
            this.gameData = data;
        });
    }

    ngOnDestroy(): void {
        if (this.gameDataSubscription) this.gameDataSubscription.unsubscribe();
    }

    hasGreatShield(): boolean {
        if (!this.gameData?.clientPlayer?.inventory) {
            return false;
        }

        for (const item of this.gameData.clientPlayer.inventory) {
            if (item && item.name === ItemName.GreatShield) {
                return true;
            }
        }

        return false;
    }
}
