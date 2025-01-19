import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
    constructor(private router: Router) {}

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
        this.showForm = false;
        this.router.navigate(['/waiting-view']);
    }
}
