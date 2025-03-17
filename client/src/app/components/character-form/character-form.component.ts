import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, AvatarType, DiceType, GameDecorations } from '@app/enums/global.enums'; //joinLobbyResult est plus la
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
// import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Component({
    selector: 'app-character-form',
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, CommonModule],
})
export class CharacterFormComponent implements OnInit {
    showForm: boolean = true;
    xSword: string = GameDecorations.XSwords;
    isLobbyCreated: boolean;
    currentAccessCode: string;
    game?: Game;
    createdPlayer: Player = {} as Player;//verifier que j ai le droit d utiliser le any ici
    avatarTypes: string[] = Object.values(AvatarType);
    // test comment
    attributes = this.characterService.attributes;
    bonusAssigned = this.characterService.bonusAssigned;
    diceAssigned = this.characterService.diceAssigned;

    unavailableAvatars: string[] = [];
    errorMessage: string = '';

    protected attributeKeys = ATTRIBUTE_KEYS;
    protected attributeTypes = AttributeType;
    protected diceTypes = DiceType;
    // eslint-disable-next-line max-params
    constructor(
        private readonly dialogRef: MatDialogRef<CharacterFormComponent>,
        private readonly characterService: CharacterService,
        // private readonly accessCodeService: AccessCodeService,
        private readonly socketClientService: SocketClientService,
        private readonly snackbarService: SnackbarService,
        private readonly cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: { game: Game; accessCode: string; isLobbyCreated: boolean },
    ) {
        this.game = data.game;
        this.isLobbyCreated = data.isLobbyCreated;
        this.currentAccessCode = data.accessCode;
        this.characterService.initializePlayer(this.createdPlayer);
    }

    ngOnInit(): void {
        this.characterService.initializeLobby(this.currentAccessCode, (avatars) => {
            this.unavailableAvatars = avatars;
            this.cdr.detectChanges();
        });
    }

    assignBonus(attribute: AttributeType): void {
        this.characterService.assignBonus(this.createdPlayer, attribute);
        console.log("Personnage après assignation du bonus :", this.createdPlayer); // ✅ Vérification après modification
    }

    assignDice(attribute: AttributeType): void {
        this.characterService.assignDice(this.createdPlayer, attribute);
    }

    // async submitCharacter(): Promise<void> {
    //     // if (!this.game) {
    //     //     this.returnHome();
    //     //     return;
    //     // }//laisser ca ici
    //     // if (!this.isCharacterValid()) return;

    //     // this.accessCodeService.setAccessCode(this.currentAccessCode);

    //     // if (this.isLobbyCreated) {
    //     //     const joinResult = await this.characterService.joinExistingLobby(this.currentAccessCode, this.createdPlayer);
    //     //     this.handleLobbyJoining(joinResult);
    //     // } else {
    //     //     this.createdPlayer.isAdmin = true;
    //     //     await this.characterService.createAndJoinLobby(this.game, this.createdPlayer);
    //     //     // this.submitCharacterForm();

    //     //     if (!this.game) {
    //     //         return;
    //     //     }
    
    //         this.characterService.submitCharacter(this.createdPlayer, this.currentAccessCode, this.isLobbyCreated,this.game, () => {
    //             sessionStorage.setItem('player', JSON.stringify(this.createdPlayer));
    //             this.resetPopup();
    //         });


    //         console.log("Personnage final avant validation :", this.createdPlayer); // ✅ Vérification avant soumission
        
    // }
    async submitCharacter(): Promise<void> {
            if (!this.game) {
                this.returnHome();
                return;
            }//laisser ca ici
        await this.characterService.submitCharacter(
            this.createdPlayer,
            this.currentAccessCode,
            this.isLobbyCreated,
            this.game!,
            () => this.resetPopup()
        );
    }

    // private submitCharacterForm(): void {
    //     if (!this.game) {
    //         return;
    //     }

    //     this.characterService.submitCharacter(this.createdPlayer, this.game, () => {
    //         sessionStorage.setItem('player', JSON.stringify(this.createdPlayer));
    //         this.resetPopup();
    //     });
    // }

    selectAvatar(avatar: string): void {
        if (this.createdPlayer.avatar) {
            this.deselectAvatar();
        }

        if (!this.unavailableAvatars.includes(avatar)) {
            this.createdPlayer.avatar = avatar;
            this.socketClientService.selectAvatar(this.currentAccessCode, avatar);

            this.unavailableAvatars = [...this.unavailableAvatars, avatar];

            this.cdr.markForCheck();
            this.cdr.detectChanges();
        } else {
            this.snackbarService.showMessage('Cet avatar est déjà pris !');
        }
    }

    deselectAvatar(): void {
        if (this.createdPlayer.avatar) {
            this.socketClientService.deselectAvatar(this.currentAccessCode);

            this.unavailableAvatars = this.unavailableAvatars.filter((av) => av !== this.createdPlayer.avatar);
            this.createdPlayer.avatar = '';

            this.cdr.markForCheck();
            this.cdr.detectChanges();
        }
    }

    checkCharacterNameLength(): void {
        if (this.createdPlayer) {
            this.characterService.checkCharacterNameLength(this.createdPlayer.name);
        }
    }

    closePopup(): void {
        this.deselectAvatar();
        this.socketClientService.removePlayerFromLobby(this.currentAccessCode, this.createdPlayer.name)
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    resetPopup(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    // private handleLobbyJoining(joinStatus: string): void {
    //     switch (joinStatus) {
    //         case JoinLobbyResult.JoinedLobby:
    //             // this.submitCharacterForm();
    //             if (!this.game) {
    //                 return;
    //             }
        
    //             this.characterService.submitCharacter(this.createdPlayer, this.game, () => {
    //                 sessionStorage.setItem('player', JSON.stringify(this.createdPlayer));
    //                 this.resetPopup();
    //             });
    //             break;
    //         case JoinLobbyResult.StayInLobby:
    //             break;
    //         case JoinLobbyResult.RedirectToHome:
    //             this.returnHome();
    //             break;
    //     }
    // }

    // private isCharacterValid(): boolean {
    //     if (!this.characterService.isCharacterValid(this.createdPlayer)) {
    //         this.characterService.showMissingDetailsError();
    //         return false;
    //     }

    //     return true;
    // }



    private returnHome(): void {
        this.closePopup();
        this.characterService.returnHome();
    }
}
