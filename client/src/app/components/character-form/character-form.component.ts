import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, AvatarType, DiceType, GameDecorations } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { CharacterService } from '@app/services/character-form/character-form.service';
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
export class CharacterFormComponent implements OnInit, OnDestroy {
    showForm: boolean = true;
    xSword: string = GameDecorations.XSwords;
    isLobbyCreated: boolean;
    currentAccessCode: string;
    game?: Game;
    createdPlayer: Player = {} as Player; //
    avatarTypes: string[] = Object.values(AvatarType);
    attributes = this.characterService.attributes;
    bonusAssigned = this.characterService.bonusAssigned;
    diceAssigned = this.characterService.diceAssigned;
    unavailableAvatars: string[] = []; //
    protected attributeKeys = ATTRIBUTE_KEYS;
    protected attributeTypes = AttributeType;
    protected diceTypes = DiceType;
    private readonly subscriptions = new Subscription();

    constructor(
        private readonly dialogRef: MatDialogRef<CharacterFormComponent>,
        private readonly characterService: CharacterService,
        private readonly socketClientService: SocketClientService,
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
            this.characterService.unavailableAvatars$.subscribe((avatars) => {
                this.unavailableAvatars = avatars;
                this.cdr.detectChanges();
            }),
        );
    }

    assignBonus(attribute: AttributeType): void {
        this.characterService.assignBonus(this.createdPlayer, attribute);
    }

    assignDice(attribute: AttributeType): void {
        this.characterService.assignDice(this.createdPlayer, attribute);
    }

    selectAvatar(avatar: string): void {
        this.characterService.selectAvatar(this.createdPlayer, avatar, this.currentAccessCode);
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

    async submitCharacter(): Promise<void> {
        if (!this.game) {
            this.returnHome();
            return;
        }
        await this.characterService.submitCharacter(this.createdPlayer, this.currentAccessCode, this.isLobbyCreated, this.game, () =>
            this.resetPopup(),
        );
    }

    closePopup(): void {
        this.deselectAvatar();
        this.socketClientService.removePlayerFromLobby(this.currentAccessCode, this.createdPlayer.name);
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    resetPopup(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    private returnHome(): void {
        this.closePopup();
        this.characterService.returnHome();
    }
}
