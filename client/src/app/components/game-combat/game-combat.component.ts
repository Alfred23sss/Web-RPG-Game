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
    // put data as input that then gifted in html when placing popup
    gameData: GameData;
    attacker: Player;
    defender: Player;
    private gameDataSubsciption: Subscription;

    constructor(
        public dialogRef: MatDialogRef<GameCombatComponent>,
        private readonly gameStateService: GameStateSocketService,
        private readonly gameplayService: GameplayService,
        @Inject(MAT_DIALOG_DATA) public data: { gameData: GameData; attacker: Player; defender: Player },
    ) {
        this.gameData = data.gameData;
        this.attacker = data.attacker;
        this.defender = data.defender;
        console.log('gamedata comp', this.gameData);
        console.log('att', this.attacker);
        console.log('def', this.defender);

        this.gameDataSubsciption = this.gameStateService.gameData$.subscribe((gameData) => {
            this.gameData = gameData;
        });
    }

    ngOnDestroy(): void {
        if (this.gameDataSubsciption) this.gameDataSubsciption.unsubscribe();
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
