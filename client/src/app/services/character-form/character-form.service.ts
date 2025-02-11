import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BONUS_VALUE, INITIAL_VALUES } from '@app/constants/global.constants';
import { AttributeType, DiceType, ErrorMessages, HttpStatus, Routes } from '@app/enums/global.enums';
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
        private readonly router: Router,
        private readonly snackbarService: SnackbarService,
        private readonly gameCommunicationService: GameCommunicationService,
    ) {}

    assignBonus(attribute: AttributeType): void {
        if (attribute === AttributeType.Vitality || attribute === AttributeType.Speed) {
            if (!this.bonusAssigned[attribute]) {
                this.attributes[attribute] += BONUS_VALUE;
                this.bonusAssigned[attribute] = true;
                const otherAttribute = attribute === AttributeType.Vitality ? AttributeType.Speed : AttributeType.Vitality;
                this.attributes[otherAttribute] = INITIAL_VALUES.attributes[otherAttribute];
                this.bonusAssigned[otherAttribute] = false;
            }
        }
    }

    assignDice(attribute: AttributeType): { attack: string | null; defense: string | null } {
        if (attribute === AttributeType.Attack || attribute === AttributeType.Defense) {
            this.diceAssigned[attribute] = true;
            this.diceAssigned[attribute === AttributeType.Attack ? AttributeType.Defense : AttributeType.Attack] = false;
            return attribute === AttributeType.Attack ? { attack: DiceType.D6, defense: DiceType.D4 } : { attack: DiceType.D4, defense: DiceType.D6 };
        }

        return { attack: null, defense: null };
    }

    submitCharacter(data: {
        characterName: string;
        selectedAvatar: string;
        game: Game;
        isBonusAssigned: boolean;
        isDiceAssigned: boolean;
        closePopup: () => void;
    }): void {
        this.validateGameAvailability(data.game, data.closePopup);
        if (this.isCharacterValid(data.characterName, data.selectedAvatar, data.isBonusAssigned, data.isDiceAssigned)) {
            this.proceedToWaitingView(data.closePopup);
        } else {
            this.showMissingDetailsError();
        }
    }

    resetAttributes(): void {
        this.attributes = { ...INITIAL_VALUES.attributes };
        this.bonusAssigned = { ...INITIAL_VALUES.bonusAssigned };
        this.diceAssigned = { ...INITIAL_VALUES.diceAssigned };
    }

    checkCharacterNameLength(characterName: string): void {
        const maxLength = 20;
        if (characterName.length >= maxLength) {
            this.snackbarService.showMessage(`The maximum name length is ${maxLength} characters.`);
        }
    }

    private validateGameAvailability(game: Game, closePopup: () => void): void {
        this.gameCommunicationService.getGameById(game.id).subscribe({
            error: (error) => {
                if (error.status === HttpStatus.InternalServerError || error.status === HttpStatus.Forbidden) {
                    this.snackbarService.showMessage(ErrorMessages.UnavailableGame);
                    this.router.navigate([Routes.CreateView]);
                    closePopup();
                }
            },
        });
    }

    private isCharacterValid(characterName: string, selectedAvatar: string, isBonusAssigned: boolean, isDiceAssigned: boolean): boolean {
        return !!characterName && !!selectedAvatar && isBonusAssigned && isDiceAssigned;
    }

    private proceedToWaitingView(closePopup: () => void): void {
        this.router.navigate([Routes.WaitingView]);
        closePopup();
    }

    private showMissingDetailsError(): void {
        this.snackbarService.showMessage(ErrorMessages.MissingCharacterDetails);
    }
}
