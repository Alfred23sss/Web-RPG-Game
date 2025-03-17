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
// import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-character-form',
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, CommonModule],
})
export class CharacterFormComponent implements OnInit {
    unavailableAvatars: string[] = [];
    private readonly subscriptions = new Subscription();

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

    // unavailableAvatars: string[] = [];
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
        // private readonly snackbarService: SnackbarService,
        private readonly cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: { game: Game; accessCode: string; isLobbyCreated: boolean },
    ) {
        this.game = data.game;
        this.isLobbyCreated = data.isLobbyCreated;
        this.currentAccessCode = data.accessCode;
        this.characterService.initializePlayer(this.createdPlayer);
    }

    ngOnInit(): void {
        this.characterService.initializeLobby(this.currentAccessCode);
        this.subscriptions.add(
            this.characterService.unavailableAvatars$.subscribe(avatars => {
                this.unavailableAvatars = avatars;
                this.cdr.detectChanges(); // Force la mise à jour de l'affichage
            })
        );
    }

    assignBonus(attribute: AttributeType): void {
        this.characterService.assignBonus(this.createdPlayer, attribute);
        console.log("Personnage après assignation du bonus :", this.createdPlayer); // ✅ Vérification après modification
    }

    assignDice(attribute: AttributeType): void {
        this.characterService.assignDice(this.createdPlayer, attribute);
    }
    
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

    selectAvatar(avatar: string): void {
        this.characterService.selectAvatar(this.createdPlayer,avatar, this.currentAccessCode)
    }

    deselectAvatar(): void {
        this.characterService.deselectAvatar(this.createdPlayer, this.currentAccessCode);
    }

    checkCharacterNameLength(): void {
        if (this.createdPlayer) {
            this.characterService.checkCharacterNameLength(this.createdPlayer.name);
            this.cdr.markForCheck();
            this.cdr.detectChanges();
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


    private returnHome(): void {
        this.closePopup();
        this.characterService.returnHome();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
