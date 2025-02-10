import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ATTRIBUTE_KEYS, ATTRIBUTE_TYPES, DICE_TYPES, ERROR_MESSAGES, INITIAL_VALUES, ROUTES } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { AvatarType, GameDecorations } from '@app/interfaces/images';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';

import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';

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
    selectedCharacter: string | null = null;
    selectedAttackDice: string | null = null;
    selectedDefenseDice: string | null = null;
    xSword = GameDecorations.XSwords;
    game: Game;

    avatarTypes = Object.values(AvatarType).filter((value) => value !== AvatarType.Default);

    attributes = { ...INITIAL_VALUES.attributes };
    bonusAssigned = { ...INITIAL_VALUES.bonusAssigned };
    diceAssigned = { ...INITIAL_VALUES.diceAssigned };

    protected attributeKeys = ATTRIBUTE_KEYS;
    protected attributeTypes = ATTRIBUTE_TYPES;
    protected diceTypes = DICE_TYPES;

    constructor(
        private router: Router,
        private dialogRef: MatDialogRef<CharacterFormComponent>,
        private snackbarService: SnackbarService,
        private gameCommunicationService: GameCommunicationService,
        @Inject(MAT_DIALOG_DATA) public data: { game: Game },
    ) {
        this.game = data.game;
    }

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
            // repetition if/else (maybe)
            this.selectedAttackDice = dice;
            this.selectedDefenseDice = dice === DICE_TYPES.D4 ? DICE_TYPES.D6 : DICE_TYPES.D4;
        } else {
            this.selectedDefenseDice = dice;
            this.selectedAttackDice = dice === DICE_TYPES.D4 ? DICE_TYPES.D6 : DICE_TYPES.D4;
        }
    }

    submitCharacter(): void {
        this.gameCommunicationService.getGameById(this.game.id).subscribe({
            next: (game) => {
                console.log('Pas de brobleme retour 200 ');
            },
            error: (error) => {
                if (error.status === 500) {
                    this.snackbarService.showMessage("Le jeu n'est plus disponible.");
                    this.router.navigate([ROUTES.CREATE_VIEW]);
                    this.closePopup();
                }
                else if (error.status === 403) {
                    this.snackbarService.showMessage("Le jeu n'est plus disponible.");
                    this.router.navigate([ROUTES.CREATE_VIEW]);
                    this.closePopup();
                }
                console.error('Erreur:', error);
            },
        });

        if (this.characterName && this.selectedAvatar && this.isBonusAssigned() && this.isDiceAssigned()) {
            this.showForm = false;
            this.router.navigate([ROUTES.WAITING_VIEW]);
            this.closePopup();
        } 
        else {
            this.snackbarService.showMessage(ERROR_MESSAGES.MISSING_CHARACTER_DETAILS);
        }
        
    }

    closePopup(): void {
        this.dialogRef.close();
    }

    private isBonusAssigned(): boolean {
        return this.bonusAssigned.vitality || this.bonusAssigned.speed;
    }

    private isDiceAssigned(): boolean {
        return this.diceAssigned.attack || this.diceAssigned.defense;
    }
}
