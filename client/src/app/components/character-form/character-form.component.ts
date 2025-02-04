import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
    selector: 'app-character-form',
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.scss'],
    imports: [FormsModule],
})
export class CharacterFormComponent {
    characterName = '';
    selectedAvatar = '';
    showForm = true;

    avatars: string[] = [
        'assets/avatars/avatar1.png',
        'assets/avatars/avatar2.png',
        'assets/avatars/avatar3.png',
        'assets/avatars/avatar4.png',
        'assets/avatars/avatar5.png',
        'assets/avatars/avatar6.png',
        'assets/avatars/avatar7.png',
        'assets/avatars/avatar8.png',
        'assets/avatars/avatar9.png',
        'assets/avatars/avatar10.png',
        'assets/avatars/avatar11.png',
        'assets/avatars/avatar12.png',
    ];

    attributes = {
        vitality: 4,
        speed: 4,
        attack: 4,
        defense: 4,
    };
    bonusAssigned = {
        vitality: false,
        speed: false,
    };
    diceAssigned = {
        attack: false,
        defense: false,
    };
    attributesList = [
        {
            key: 'vitality',
            label: 'Vitality',
            value: () => this.attributes.vitality,
            bonusDisabled: () => this.bonusAssigned.vitality,
            assignBonus: () => this.assignBonus('vitality'),
        },
        {
            key: 'speed',
            label: 'Speed',
            value: () => this.attributes.speed,
            bonusDisabled: () => this.bonusAssigned.speed,
            assignBonus: () => this.assignBonus('speed'),
        },
        {
            key: 'attack',
            label: 'Attack',
            value: () => this.attributes.attack,
            bonusDisabled: () => this.diceAssigned.attack,
            assignDice: () => this.assignDice('attack'),
        },
        {
            key: 'defense',
            label: 'Defense',
            value: () => this.attributes.defense,
            bonusDisabled: () => this.diceAssigned.defense,
            assignDice: () => this.assignDice('defense'),
        },
    ];

    constructor(
        private router: Router,
        private dialogRef: MatDialogRef<CharacterFormComponent>,
    ) {}

    assignBonus(attribute: 'vitality' | 'speed') {
        if (!this.bonusAssigned[attribute]) {
            this.attributes[attribute] += 2;
            this.bonusAssigned[attribute] = true;

            const otherAttribute = attribute === 'vitality' ? 'speed' : 'vitality';
            if (this.bonusAssigned[otherAttribute]) {
                this.attributes[otherAttribute] = 4;
                this.bonusAssigned[otherAttribute] = false;
            }
        }
    }

    assignDice(attribute: 'attack' | 'defense') {
        if (!this.diceAssigned[attribute]) {
            this.diceAssigned[attribute] = true;
            const otherAttribute = attribute === 'attack' ? 'defense' : 'attack';
            if (this.diceAssigned[otherAttribute]) {
                this.diceAssigned[otherAttribute] = false;
            }
        } else {
            this.diceAssigned[attribute] = false;
        }
    }

    submitCharacter() {
        const hasBonus = this.bonusAssigned.vitality || this.bonusAssigned.speed;
        const hasDice = this.diceAssigned.attack || this.diceAssigned.defense;
        if (this.characterName && this.selectedAvatar && hasBonus && hasDice) {
            this.showForm = false;
            this.router.navigate(['/waiting-view']);
        } else {
            alert(
                // eslint-disable-next-line max-len
                'Please ensure you have:\n- Assigned +2 to Vitality or Speed.\n- Assigned a D6 to Attack or Defense.\n- Entered a name and selected an avatar.',
            );
        }
    }

    closePopup() {
        this.dialogRef.close();
    }
}
