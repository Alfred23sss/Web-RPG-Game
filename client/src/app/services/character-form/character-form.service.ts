import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BONUS_VALUE, INITIAL_VALUES } from '@app/constants/global.constants';
import { AttributeType, DiceType, ErrorMessages, HttpStatus, Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

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
        private readonly socketClientService: SocketClientService,
        private readonly accessCodeService: AccessCodeService,
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

    submitCharacter(player: Player, game: Game, closePopup: () => void): void {
        this.validateGameAvailability(game, closePopup);

        if (this.isCharacterValid(player)) {
            this.proceedToWaitingView(closePopup);
        } else {
            this.showMissingDetailsError();
        }
    }

    async joinExistingLobby(accessCode: string, player: Player): Promise<boolean> {
        return new Promise((resolve) => {
            this.socketClientService.getLobby(accessCode).subscribe({
                next: (lobby) => {
                    if (lobby.isLocked) {
                        this.snackbarService
                            .showConfirmation("La salle est verrouillée, voulez-vous être redirigé vers la page d'accueil")
                            .subscribe({
                                next: (result) => {
                                    if (result) {
                                        resolve(true);
                                    } else {
                                        resolve(true);
                                    }
                                },
                            });
                    } else {
                        this.socketClientService.joinLobby(accessCode, player);
                        resolve(false);
                    }
                },
            });
        });
    }

    async createAndJoinLobby(game: Game, player: Player): Promise<void> {
        try {
            const accessCode = await this.socketClientService.createLobby(game, player);
            this.accessCodeService.setAccessCode(accessCode);
        } catch (error) {
            console.error('Error creating or joining lobby:', error);
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
            this.snackbarService.showMessage(`La longueur maximale du nom est de ${maxLength} caractères`);
        }
    }

    returnHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    isCharacterValid(player: Player): boolean {
        return !!player.name.trim() && !!player.avatar && this.hasBonusAssigned(player) && this.hasDiceAssigned(player);
    }

    showMissingDetailsError(): void {
        this.snackbarService.showMessage(ErrorMessages.MissingCharacterDetails);
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

    private hasBonusAssigned(player: Player): boolean {
        return player.speed !== INITIAL_VALUES.attributes[AttributeType.Speed] || player.hp.max !== INITIAL_VALUES.attributes[AttributeType.Vitality];
    }

    private hasDiceAssigned(player: Player): boolean {
        return player.attack.bonusDice !== DiceType.Uninitialized && player.defense.bonusDice !== DiceType.Uninitialized;
    }

    private proceedToWaitingView(closePopup: () => void): void {
        this.router.navigate([Routes.WaitingView]);
        closePopup();
    }
}
