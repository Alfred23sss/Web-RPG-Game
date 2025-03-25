import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BONUS_VALUE, INITIAL_VALUES, UNINITIALIZED_PLAYER } from '@app/constants/global.constants';
import { AttributeType, DiceType, ErrorMessages, HttpStatus, JoinLobbyResult, Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CharacterService {
    unavailableAvatarsSubject = new BehaviorSubject<string[]>([]);
    unavailableAvatars$ = this.unavailableAvatarsSubject.asObservable();
    onCharacterSubmitted$ = new Subject<void>();
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
        Object.assign(player, { ...UNINITIALIZED_PLAYER });
    }

    initializeLobby(accessCode: string): void {
        this.socketClientService.emit('joinRoom', accessCode);

        this.socketClientService.on<{ avatars?: string[] }>('updateUnavailableOptions', (data) => {
            if (!data.avatars) return;
            this.unavailableAvatarsSubject.next([...data.avatars]);
        });

        this.socketClientService.emit('requestUnavailableOptions', accessCode);
    }

    assignBonus(player: Player, attribute: AttributeType): void {
        if (attribute === AttributeType.Vitality || attribute === AttributeType.Speed) {
            this.resetOtherBonus(attribute);
            this.attributes[attribute] = INITIAL_VALUES.attributes[attribute] + BONUS_VALUE;
            this.bonusAssigned[attribute] = true;
        }
        this.updatePlayerStats(player, attribute);
    }

    assignDice(player: Player, attribute: AttributeType): void {
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

    selectAvatar(player: Player, avatar: string, currentAccessCode: string): void {
        if (player.avatar) {
            this.deselectAvatar(player, currentAccessCode);
        }

        if (!this.unavailableAvatarsSubject.value.includes(avatar)) {
            player.avatar = avatar;
            this.socketClientService.emit('selectAvatar', { accessCode: currentAccessCode, avatar });

            const updatedAvatars = [...this.unavailableAvatarsSubject.value, avatar];
            this.unavailableAvatarsSubject.next(updatedAvatars);
        }
    }

    deselectAvatar(player: Player, currentAccessCode: string): void {
        if (player.avatar) {
            this.socketClientService.emit('deselectAvatar', { accessCode: currentAccessCode });

            const updatedAvatars = this.unavailableAvatarsSubject.value.filter((av) => av !== player.avatar);
            this.unavailableAvatarsSubject.next(updatedAvatars);
            player.avatar = '';
        }
    }

    async submitCharacter(player: Player, currentAccessCode: string, isLobbyCreated: boolean, game: Game): Promise<void> {
        if (!this.isCharacterValid(player)) {
            this.showMissingDetailsError();
            return;
        }

        this.accessCodeService.setAccessCode(currentAccessCode);

        if (isLobbyCreated) {
            const joinResult = await this.joinExistingLobby(currentAccessCode, player);
            this.handleLobbyJoining(joinResult, player, game, currentAccessCode);
        } else {
            player.isAdmin = true;
            await this.createAndJoinLobby(game, player);
            this.finalizeCharacterSubmission(player);
        }
    }

    async joinExistingLobby(accessCode: string, player: Player): Promise<string> {
        return new Promise((resolve) => {
            this.socketClientService.getLobby(accessCode).subscribe({
                next: (lobby) => {
                    if (lobby.isLocked) {
                        this.snackbarService.showConfirmation(ErrorMessages.LockedRoom).subscribe({
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
                error: () => {
                    this.snackbarService.showMessage(ErrorMessages.UnavailableGame);
                    resolve(JoinLobbyResult.RedirectToHome);
                },
            });
        });
    }

    resetAttributes(): void {
        this.attributes = { ...INITIAL_VALUES.attributes };
        this.bonusAssigned = { ...INITIAL_VALUES.bonusAssigned };
        this.diceAssigned = { ...INITIAL_VALUES.diceAssigned };
    }

    checkCharacterNameLength(characterName: string): void {
        const maxLength = 19;
        if (characterName.length > maxLength) {
            this.snackbarService.showMessage(ErrorMessages.MaxNameLength);
        }
    }

    async createAndJoinLobby(game: Game, player: Player): Promise<void> {
        const accessCode = await this.socketClientService.createLobby(game, player);
        this.accessCodeService.setAccessCode(accessCode);
    }

    isCharacterValid(player: Player): boolean {
        return !!player.name.trim() && !!player.avatar && this.hasBonusAssigned(player) && this.hasDiceAssigned(player);
    }

    returnHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    showMissingDetailsError(): void {
        this.snackbarService.showMessage(ErrorMessages.MissingCharacterDetails);
    }

    private resetOtherBonus(attribute: AttributeType): void {
        const otherAttribute = attribute === AttributeType.Vitality ? AttributeType.Speed : AttributeType.Vitality;
        if (this.bonusAssigned[otherAttribute]) {
            this.attributes[otherAttribute] = INITIAL_VALUES.attributes[otherAttribute];
            this.bonusAssigned[otherAttribute] = false;
        }
    }
    private updatePlayerStats(player: Player, attribute: AttributeType): void {
        if (attribute === AttributeType.Vitality) {
            player.hp.current = player.hp.max = this.attributes[AttributeType.Vitality];
            player.speed = INITIAL_VALUES.attributes[AttributeType.Speed];
        } else if (attribute === AttributeType.Speed) {
            player.speed = this.attributes[AttributeType.Speed];
            player.movementPoints = player.speed;
            player.hp.current = player.hp.max = INITIAL_VALUES.attributes[AttributeType.Vitality];
        }
    }

    private finalizeCharacterSubmission(player: Player): void {
        if (this.isCharacterValid(player)) {
            sessionStorage.setItem('player', JSON.stringify(player));
            this.proceedToWaitingView();
            this.onCharacterSubmitted$.next();
        } else {
            this.showMissingDetailsError();
        }
    }

    private handleLobbyJoining(joinStatus: string, player: Player, game: Game, currentAccessCode: string): void {
        switch (joinStatus) {
            case JoinLobbyResult.JoinedLobby:
                this.finalizeCharacterSubmission(player);
                break;
            case JoinLobbyResult.StayInLobby:
                return;
            case JoinLobbyResult.RedirectToHome:
                this.returnHome();
                this.socketClientService.emit('leaveLobby', {
                    accessCode: currentAccessCode,
                    playerName: '',
                });

                return;
        }
        this.validateGameAvailability(game);
    }

    private hasBonusAssigned(player: Player): boolean {
        return player.speed !== INITIAL_VALUES.attributes[AttributeType.Speed] || player.hp.max !== INITIAL_VALUES.attributes[AttributeType.Vitality];
    }

    private hasDiceAssigned(player: Player): boolean {
        return player.attack.bonusDice !== DiceType.Uninitialized && player.defense.bonusDice !== DiceType.Uninitialized;
    }

    private validateGameAvailability(game: Game): void {
        this.gameCommunicationService.getGameById(game.id).subscribe({
            error: (error) => {
                if (error.status === HttpStatus.InternalServerError || error.status === HttpStatus.Forbidden) {
                    this.snackbarService.showMessage(ErrorMessages.UnavailableGame);
                    this.router.navigate([Routes.CreateView]);
                }
            },
        });
    }

    private proceedToWaitingView(): void {
        this.router.navigate([Routes.WaitingView]);
    }
}
