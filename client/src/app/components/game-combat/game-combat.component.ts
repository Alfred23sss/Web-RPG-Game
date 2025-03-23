import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-game-combat',
    templateUrl: './game-combat.component.html',
    styleUrls: ['./game-combat.component.css'],
})
export class GameCombatComponent {
    // put data as input that then gifted in html when placing popup
    player1 = { name: 'Player 1', avatar: 'assets/avatars/avatar_archer.png' };
    player2 = { name: 'Player 2', avatar: 'assets/avatars/avatar_ranger.png' };

    player1Message: string = '';
    player2Message: string = '';

    constructor(public dialogRef: MatDialogRef<GameCombatComponent>) {}

    onAttack(player: 'player1' | 'player2') {
        if (player === 'player1') {
            this.player1Message = 'Attack successful! Damage dealt: 10';
        } else {
            this.player2Message = 'Attack successful! Damage dealt: 10';
        }
    }

    onEvade(player: 'player1' | 'player2') {
        if (player === 'player1') {
            this.player1Message = 'Evaded successfully!';
        } else {
            this.player2Message = 'Evaded successfully!';
        }
    }

    onClose() {
        this.dialogRef.close();
    }
}
