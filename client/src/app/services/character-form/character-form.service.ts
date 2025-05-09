import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BONUS_VALUE, INITIAL_VALUES, PLAYER_STORAGE, UNINITIALIZED_PLAYER } from '@app/constants/global.constants';
import { AttributeType, ErrorMessages, SocketEvent } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { DiceType, HttpStatus, JoinLobbyResult, Routes } from '@common/enums';
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

    // In this service, six parameters are necessary because the service’s role is to manage character creation.
    // First, we must use gameCommunicationService to check if the game is available, then use the access code communication service
    // to validate the access code, and finally use the socket service to create and join the room.
    // MatDialog, router, and snackbar are simply used to display messages and navigate between pages.
    // eslint-disable-next-line max-params
    constructor(
        private readonly router: Router,
        private readonly snackbarService: SnackbarService,
        private readonly gameCommunicationService: GameCommunicationService,
        private readonly socketClientService: SocketClientService,
        private readonly accessCodeService: AccessCodeService,
        private readonly matDialog: MatDialog,
    ) {}

    initializePlayer(player: Player): void {
        Object.assign(player, { ...UNINITIALIZED_PLAYER });
        player.attack.bonusDice = DiceType.Uninitialized;
        player.defense.bonusDice = DiceType.Uninitialized;
    }

    initializeLobby(accessCode: string): void {
        this.socketClientService.emit(SocketEvent.JoinRoom, accessCode);

        this.socketClientService.on<{ avatars?: string[] }>(SocketEvent.UnavailableOption, (data) => {
            if (!data.avatars) return;
            this.unavailableAvatarsSubject.next([...data.avatars]);
        });

        this.socketClientService.emit(SocketEvent.RequestUnavailableOptions, accessCode);
    }

    assignBonus(player: Player, attribute: AttributeType): void {
        if (attribute === AttributeType.Vitality || attribute === AttributeType.Speed) {
            this.resetOtherBonus(attribute);
            this.attributes[attribute] = INITIAL_VALUES.attributes[attribute] + BONUS_VALUE;
            this.bonusAssigned[attribute] = true;
        }
        this.updatePlayerStats(player, attribute);
    }

    assignDice(player: Player, attribute: AttributeType, diceType: DiceType): void {
        if (attribute === AttributeType.Attack || attribute === AttributeType.Defense) {
            if (attribute === AttributeType.Attack) {
                player.attack.bonusDice = diceType;
                player.defense.bonusDice = diceType === DiceType.D6 ? DiceType.D4 : DiceType.D6;
            } else {
                player.defense.bonusDice = diceType;
                player.attack.bonusDice = diceType === DiceType.D6 ? DiceType.D4 : DiceType.D6;
            }
        }
    }

    selectAvatar(player: Player, avatar: string, currentAccessCode: string): void {
        if (player.avatar) {
            this.deselectAvatar(player, currentAccessCode);
        }

        if (!this.unavailableAvatarsSubject.value.includes(avatar)) {
            player.avatar = avatar;
            this.socketClientService.emit(SocketEvent.SelectAvatar, { accessCode: currentAccessCode, avatar });

            const updatedAvatars = [...this.unavailableAvatarsSubject.value, avatar];
            this.unavailableAvatarsSubject.next(updatedAvatars);
        }
    }

    deselectAvatar(player: Player, currentAccessCode: string): void {
        if (player.avatar) {
            this.socketClientService.emit(SocketEvent.DeselectAvatar, { accessCode: currentAccessCode });

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
            this.handleLobbyJoining(joinResult, player, game);
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
                                const joinLobbyResult = result ? JoinLobbyResult.RedirectToHome : JoinLobbyResult.StayInLobby;
                                resolve(joinLobbyResult);
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
        this.matDialog.closeAll();
        this.resetAttributes();
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
            sessionStorage.setItem(PLAYER_STORAGE, JSON.stringify(player));
            this.proceedToWaitingView();
            this.onCharacterSubmitted$.next();
        } else {
            this.showMissingDetailsError();
        }
    }

    private handleLobbyJoining(joinStatus: string, player: Player, game: Game): void {
        switch (joinStatus) {
            case JoinLobbyResult.JoinedLobby:
                this.finalizeCharacterSubmission(player);
                break;
            case JoinLobbyResult.StayInLobby:
                return;
            case JoinLobbyResult.RedirectToHome:
                this.returnHome();
                this.socketClientService.emit(SocketEvent.ManualDisconnect, {
                    isInGame: false,
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
