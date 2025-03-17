import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BONUS_VALUE, INITIAL_VALUES } from '@app/constants/global.constants';
import { AttributeType, DiceType, ErrorMessages, HttpStatus, JoinLobbyResult, Routes } from '@app/enums/global.enums';
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
    initializePlayer(player: Player): void {
        player.name = '';
        player.avatar = '';
        player.speed = 4;
        player.attack = { value: 4, bonusDice: DiceType.Uninitialized };
        player.defense = { value: 4, bonusDice: DiceType.Uninitialized };
        player.hp = { current: 4, max: 4 };
        player.movementPoints = 4;
        player.actionPoints = 3;
        player.inventory = [null, null];
        player.isAdmin = false;
        player.hasAbandoned = false;
        player.isActive = false;
        player.combatWon = 0;
    }

    initializeLobby(accessCode: string, updateAvatarsCallback: (avatars: string[]) => void): void {
        this.socketClientService.emit('joinRoom', accessCode);
    
        this.socketClientService.onUpdateUnavailableOptions((data: { avatars?: string[] }) => {
            if (!data.avatars) return;
            updateAvatarsCallback([...data.avatars]);
        });
    
        this.socketClientService.emit('requestUnavailableOptions', accessCode);
    }
    

    assignBonus(player:Player, attribute: AttributeType): void {//decompose en fonctions??
        if (attribute === AttributeType.Vitality || attribute === AttributeType.Speed) {
            const otherAttribute = attribute === AttributeType.Vitality ? AttributeType.Speed : AttributeType.Vitality;
            if (this.bonusAssigned[otherAttribute]) {
                this.attributes[otherAttribute] = INITIAL_VALUES.attributes[otherAttribute];
                this.bonusAssigned[otherAttribute] = false;
            }
            this.attributes[attribute] = INITIAL_VALUES.attributes[attribute] + BONUS_VALUE;
            this.bonusAssigned[attribute] = true;
        }
            if (attribute === AttributeType.Vitality) {
                player.hp.current = player.hp.max = this.attributes[AttributeType.Vitality];
                player.speed = INITIAL_VALUES.attributes[AttributeType.Speed];
            } else if (attribute === AttributeType.Speed) {
                player.speed = this.attributes[AttributeType.Speed];
                player.movementPoints = player.speed;
                player.hp.current = player.hp.max = INITIAL_VALUES.attributes[AttributeType.Vitality];
            }
    }

    assignDice(player:Player, attribute: AttributeType): void {
        if (attribute === AttributeType.Attack || attribute === AttributeType.Defense) {
            this.diceAssigned[attribute] = true;
            this.diceAssigned[attribute === AttributeType.Attack ? AttributeType.Defense : AttributeType.Attack] = false;
            if (attribute === AttributeType.Attack) {
                player.attack.bonusDice = DiceType.D6;
                player.defense.bonusDice = DiceType.D4;
            }
            if (attribute === AttributeType.Defense) {
                player.attack.bonusDice = DiceType.D4;
                player.defense.bonusDice = DiceType.D6;
            }
            
        }
    }

    // async submitCharacter(player: Player, currentAccessCode:string, isLobbyCreated:boolean ,game: Game, closePopup: () => void): Promise<void> {//beaucoup d'arguments

    //     if (!this.isCharacterValid(player)){
    //         this.showMissingDetailsError()
    //         return;
    //     } 

    //     this.accessCodeService.setAccessCode(currentAccessCode);

    //     if (isLobbyCreated) {
    //         const joinResult = await this.joinExistingLobby(currentAccessCode, player);
    //         this.handleLobbyJoining(joinResult);
    //     } else {
    //         player.isAdmin = true;
    //         await this.createAndJoinLobby(game, player);
    //     this.validateGameAvailability(game, closePopup);

    //     if (this.isCharacterValid(player)) {
    //         sessionStorage.setItem('player', JSON.stringify(player));
    //         this.proceedToWaitingView(closePopup);
    //     } else {
    //         this.showMissingDetailsError();
    //     }
    // }
    // }
    async submitCharacter(player: Player, currentAccessCode: string, isLobbyCreated: boolean, game: Game, closePopup: () => void): Promise<void> {
        if (!this.isCharacterValid(player)) {
            this.showMissingDetailsError();
            return;
        }
    
        this.accessCodeService.setAccessCode(currentAccessCode);
    
        if (isLobbyCreated) {
            const joinResult = await this.joinExistingLobby(currentAccessCode, player);
            this.handleLobbyJoining(joinResult, player, game, closePopup);
        } else {
            player.isAdmin = true;
            await this.createAndJoinLobby(game, player);
            this.finalizeCharacterSubmission(player, closePopup);
        }
    }
    
    private handleLobbyJoining(joinStatus: string, player: Player, game: Game, closePopup: () => void): void {
        switch (joinStatus) {
            case JoinLobbyResult.JoinedLobby:
                this.finalizeCharacterSubmission(player, closePopup);
                break;
            case JoinLobbyResult.StayInLobby:
                // Ne fait rien, l'utilisateur reste dans le lobby
                break;
            case JoinLobbyResult.RedirectToHome:
                this.returnHome();
                break;
        }
        this.validateGameAvailability(game, closePopup);

            if (this.isCharacterValid(player)) {
                sessionStorage.setItem('player', JSON.stringify(player));
                this.proceedToWaitingView(closePopup);
            } else {
                this.showMissingDetailsError();
            }
        
    }
    
    private finalizeCharacterSubmission(player: Player, closePopup: () => void): void {
        if (this.isCharacterValid(player)) {
            sessionStorage.setItem('player', JSON.stringify(player));
            this.proceedToWaitingView(closePopup);
        } else {
            this.showMissingDetailsError();
        }
    }
    

    
    

    async joinExistingLobby(accessCode: string, player: Player): Promise<string> {
        return new Promise((resolve) => {
            this.socketClientService.getLobby(accessCode).subscribe({
                next: (lobby) => {
                    if (lobby.isLocked) {
                        this.snackbarService
                            .showConfirmation("La salle est verrouillée, voulez-vous être redirigé vers la page d'accueil")
                            .subscribe({
                                next: (result) => {
                                    if (result) {
                                        resolve(JoinLobbyResult.RedirectToHome);
                                    } else {
                                        resolve(JoinLobbyResult.StayInLobby);
                                    }
                                },
                            });
                    } else {
                        this.socketClientService.joinLobby(accessCode, player);
                        resolve(JoinLobbyResult.JoinedLobby);
                    }
                },
            });
        });
    }

    async createAndJoinLobby(game: Game, player: Player): Promise<void> {
        const accessCode = await this.socketClientService.createLobby(game, player);
        this.accessCodeService.setAccessCode(accessCode);
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
