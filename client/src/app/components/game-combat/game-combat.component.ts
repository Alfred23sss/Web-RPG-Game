import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GameData } from '@app/classes/gameData';
import { Player } from '@app/interfaces/player';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-combat',
    templateUrl: './game-combat.component.html',
    styleUrls: ['./game-combat.component.scss'],
    imports: [CommonModule],
})
export class GameCombatComponent implements OnDestroy {
    gameData: GameData;
    attacker: Player;
    defender: Player;
    private gameDataSubscription: Subscription;
    private closePopupSubscription: Subscription;

    constructor(
        public dialogRef: MatDialogRef<GameCombatComponent>,
        private readonly gameStateService: GameStateSocketService,
        private readonly gameplayService: GameplayService,
        @Inject(MAT_DIALOG_DATA) public data: { gameData: GameData; attacker: Player; defender: Player },
    ) {
        this.gameData = data.gameData;
        this.attacker = data.gameData.clientPlayer;
        this.defender = data.defender;

        this.gameDataSubscription = this.gameStateService.gameData$.subscribe((gameData) => {
            this.gameData = gameData;
            console.log('data cahnge', gameData.clientPlayer.hp.current);
        });

        this.closePopupSubscription = this.gameStateService.closePopup$.subscribe(() => {
            this.onClose();
        });
    }

    ngOnDestroy(): void {
        if (this.gameDataSubscription) this.gameDataSubscription.unsubscribe();
        if (this.closePopupSubscription) this.closePopupSubscription.unsubscribe();
    }

    onAttack() {
        this.gameplayService.attack(this.gameData);
    }

    onEvade() {
        this.gameplayService.evade(this.gameData);
    }

    onClose() {
        this.dialogRef.close();
    }
}
