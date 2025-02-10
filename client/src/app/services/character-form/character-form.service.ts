import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ATTRIBUTE_TYPES, DICE_TYPES, ERROR_MESSAGES, INITIAL_VALUES, ROUTES } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';

@Injectable({
    providedIn: 'root',
})
export class CharacterService {
    attributes = { ...INITIAL_VALUES.attributes };
    bonusAssigned = { ...INITIAL_VALUES.bonusAssigned };
    diceAssigned = { ...INITIAL_VALUES.diceAssigned };

    constructor(
        private router: Router,
        private snackbarService: SnackbarService,
        private gameCommunicationService: GameCommunicationService,
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

    assignDice(
        attribute: string,
        dice: string,
        selectedAttackDice: string | null,
        selectedDefenseDice: string | null,
    ): { attack: string | null; defense: string | null } {
        this.diceAssigned[attribute] = true;
        this.diceAssigned[attribute === ATTRIBUTE_TYPES.ATTACK ? ATTRIBUTE_TYPES.DEFENSE : ATTRIBUTE_TYPES.ATTACK] = false;

        if (attribute === ATTRIBUTE_TYPES.ATTACK) {
            selectedAttackDice = dice;
            selectedDefenseDice = dice === DICE_TYPES.D4 ? DICE_TYPES.D6 : DICE_TYPES.D4;
        } else {
            selectedDefenseDice = dice;
            selectedAttackDice = dice === DICE_TYPES.D4 ? DICE_TYPES.D6 : DICE_TYPES.D4;
        }

        return { attack: selectedAttackDice, defense: selectedDefenseDice };
    }

    submitCharacter(
        characterName: string,
        selectedAvatar: string,
        game: Game,
        isBonusAssigned: boolean,
        isDiceAssigned: boolean,
        closePopup: () => void,
    ) {
        this.gameCommunicationService.getGameById(game.id).subscribe({
            next: () => {
                console.log('Pas de problème, retour 200');
            },
            error: (error) => {
                if (error.status === 500 || error.status === 403) {
                    this.snackbarService.showMessage("Le jeu n'est plus disponible.");
                    this.router.navigate([ROUTES.CREATE_VIEW]);
                    closePopup();
                }
                console.error('Erreur:', error);
            },
        });

        if (characterName && selectedAvatar && isBonusAssigned && isDiceAssigned) {
            this.router.navigate([ROUTES.WAITING_VIEW]);
            closePopup();
        } else {
            this.snackbarService.showMessage(ERROR_MESSAGES.MISSING_CHARACTER_DETAILS);
        }
    }
}
