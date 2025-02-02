import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ATTRIBUTE_KEYS, ATTRIBUTE_TYPES, AVATARS, DICE_TYPES, INITIAL_VALUES, ROUTES, ERROR_MESSAGES,SNACKBAR_CONFIG } from '../../constants/global.constants';

@Component({
    selector: 'app-character-form',
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.scss'],
    imports: [FormsModule],
})
export class CharacterFormComponent {
    ATTRIBUTE_KEYS = ATTRIBUTE_KEYS;
    ATTRIBUTE_TYPES = ATTRIBUTE_TYPES;
    DICE_TYPES = DICE_TYPES;
    characterName = '';
    selectedAvatar = '';
    showForm = true;
    selectedCharacter: string | null = null;
    selectedAttackDice: string | null = null;
    selectedDefenseDice: string | null = null;

    avatars: string[] = AVATARS;

    attributes = { ...INITIAL_VALUES.attributes };
    bonusAssigned = { ...INITIAL_VALUES.bonusAssigned };
    diceAssigned = { ...INITIAL_VALUES.diceAssigned };

    constructor(
        private router: Router,
        private dialogRef: MatDialogRef<CharacterFormComponent>,
        private snackBar: MatSnackBar,
    ) {}

    assignBonus(attribute: string) {
        if (!this.bonusAssigned[attribute]) {
            this.attributes[attribute] += 2;
            this.bonusAssigned[attribute] = true;
            const otherAttribute = attribute === ATTRIBUTE_TYPES.VITALITY ? ATTRIBUTE_TYPES.SPEED : ATTRIBUTE_TYPES.VITALITY;
            this.attributes[otherAttribute] = INITIAL_VALUES.attributes[otherAttribute];
            this.bonusAssigned[otherAttribute] = false;
        }
    }

    assignDice(attribute: string, dice: string) {
        this.diceAssigned[attribute] = true;
        this.diceAssigned[attribute === ATTRIBUTE_TYPES.ATTACK ? ATTRIBUTE_TYPES.DEFENSE : ATTRIBUTE_TYPES.ATTACK] = false;
        if (attribute === ATTRIBUTE_TYPES.ATTACK) {
            this.selectedAttackDice = dice;
            this.selectedDefenseDice = dice === DICE_TYPES.D4 ? DICE_TYPES.D6 : DICE_TYPES.D4;
        } else {
            this.selectedDefenseDice = dice;
            this.selectedAttackDice = dice === DICE_TYPES.D4 ? DICE_TYPES.D6 : DICE_TYPES.D4;
        }
    }

    submitCharacter(): void {
        if (this.characterName && this.selectedAvatar && (this.bonusAssigned.vitality || this.bonusAssigned.speed) && (this.diceAssigned.attack || this.diceAssigned.defense)) {
            this.showForm = false;
            this.router.navigate([ROUTES.WAITING_VIEW]);
        } else {
            this.snackBar.open(ERROR_MESSAGES.MISSING_CHARACTER_DETAILS, SNACKBAR_CONFIG.ACTION, {
                duration: SNACKBAR_CONFIG.DURATION,
            });
        }
    }

    closePopup(): void {
        this.dialogRef.close();
    }
}
