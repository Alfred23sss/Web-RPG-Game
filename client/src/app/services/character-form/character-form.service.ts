import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ATTRIBUTE_TYPES, BONUS_VALUE, DICE_TYPES, ERROR_MESSAGES, HTTP_STATUS, INITIAL_VALUES, ROUTES } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';

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
            this.attributes[attribute] += BONUS_VALUE;
            this.bonusAssigned[attribute] = true;
            const otherAttribute = attribute === ATTRIBUTE_TYPES.VITALITY ? ATTRIBUTE_TYPES.SPEED : ATTRIBUTE_TYPES.VITALITY;
            this.attributes[otherAttribute] = INITIAL_VALUES.attributes[otherAttribute];
            this.bonusAssigned[otherAttribute] = false;
        }
    }

    assignDice(attribute: string): { attack: string | null; defense: string | null } {
        this.diceAssigned[attribute] = true;
        this.diceAssigned[attribute === ATTRIBUTE_TYPES.ATTACK ? ATTRIBUTE_TYPES.DEFENSE : ATTRIBUTE_TYPES.ATTACK] = false;
        return attribute === ATTRIBUTE_TYPES.ATTACK
            ? { attack: DICE_TYPES.D6, defense: DICE_TYPES.D4 }
            : { attack: DICE_TYPES.D4, defense: DICE_TYPES.D6 };
    }

    submitCharacter(characterName: string,selectedAvatar: string,game: Game,isBonusAssigned: boolean,isDiceAssigned: boolean, closePopup: () => void,
    ) {
        this.validateGameAvailability(game, closePopup);

        if (this.isCharacterValid(characterName, selectedAvatar, isBonusAssigned, isDiceAssigned)) {
            this.proceedToWaitingView(closePopup);
        } else {
            this.showMissingDetailsError();
        }
    }

    private validateGameAvailability(game: Game, closePopup: () => void) {
        this.gameCommunicationService.getGameById(game.id).subscribe({
            next: () => {},
            error: (error) => {
                if (error.status === HTTP_STATUS.INTERNAL_SERVER_ERROR || error.status === HTTP_STATUS.FORBIDDEN) {
                    this.snackbarService.showMessage(ERROR_MESSAGES.UNAVAILABLE_GAME);
                    this.router.navigate([ROUTES.CREATE_VIEW]);
                    closePopup();
                }
                // console.error('Erreur:', error);
            },
        });
    }

    private isCharacterValid(characterName: string, selectedAvatar: string, isBonusAssigned: boolean, isDiceAssigned: boolean): boolean {
        return !!characterName && !!selectedAvatar && isBonusAssigned && isDiceAssigned;
    }

    private proceedToWaitingView(closePopup: () => void) {
        this.router.navigate([ROUTES.WAITING_VIEW]);
        closePopup();
    }

    private showMissingDetailsError() {
        this.snackbarService.showMessage(ERROR_MESSAGES.MISSING_CHARACTER_DETAILS);
    }

    resetAttributes() {
        this.attributes = { ...INITIAL_VALUES.attributes };
        this.bonusAssigned = { ...INITIAL_VALUES.bonusAssigned };
        this.diceAssigned = { ...INITIAL_VALUES.diceAssigned };
    }
}