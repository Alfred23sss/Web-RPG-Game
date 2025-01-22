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

    showForm = true;

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
                'Please ensure you have:\n- Assigned +2 to one attribute (Vitality or Speed).\n- Assigned a D6 to one attribute (Attack or Defense).\n- Entered a name and selected an avatar.',
            );
        }
    }

    closePopup() {
        this.resetSelections();
        this.dialogRef.close();
    }

    private resetSelections() {
        this.characterName = '';
        this.selectedAvatar = '';
        this.attributes = {
            vitality: 4,
            speed: 4,
            attack: 4,
            defense: 4,
        };
        this.bonusAssigned = {
            vitality: false,
            speed: false,
        };
        this.diceAssigned = {
            attack: false,
            defense: false,
        };
    }
}
