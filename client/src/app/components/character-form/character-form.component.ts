import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, AvatarType, DiceType, GameDecorations, JoinLobbyResult } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
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
    createdPlayer: Player;
    selectedAttackDice: DiceType | null = null;
    selectedDefenseDice: DiceType | null = null;
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
        private readonly accessCodeService: AccessCodeService,
        private readonly socketClientService: SocketClientService,
        private readonly snackbarService: SnackbarService,
        private readonly cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: { game: Game; accessCode: string; isLobbyCreated: boolean },
    ) {
        this.game = data.game;
        this.isLobbyCreated = data.isLobbyCreated;
        this.currentAccessCode = data.accessCode;
        this.createdPlayer = {
            name: '',
            avatar: '',
            speed: 4,
            attack: { value: 4, bonusDice: DiceType.Uninitialized },
            defense: { value: 4, bonusDice: DiceType.Uninitialized },
            hp: { current: 4, max: 4 },
            movementPoints: 4,
            actionPoints: 3,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            isActive: false,
            combatWon: 0,
        };
    }

    ngOnInit(): void {
        this.socketClientService.emit('joinRoom', this.currentAccessCode);

        this.socketClientService.onUpdateUnavailableOptions((data: { avatars?: string[] }) => {
            if (!data.avatars) return;
            this.unavailableAvatars = [...data.avatars];
            this.cdr.detectChanges();
        });

        this.socketClientService.emit('requestUnavailableOptions', this.currentAccessCode);
    }

    assignBonus(attribute: AttributeType): void {
        this.characterService.assignBonus(attribute);
        if (attribute === AttributeType.Vitality) {
            this.createdPlayer.hp.current = this.createdPlayer.hp.max = this.characterService.attributes[AttributeType.Vitality];
        } else if (attribute === AttributeType.Speed) {
            this.createdPlayer.speed = this.characterService.attributes[AttributeType.Speed];
            this.createdPlayer.movementPoints = this.createdPlayer.speed;
        }
    }

    assignDice(attribute: AttributeType): void {
        const { attack, defense } = this.characterService.assignDice(attribute);
        if (attack) {
            this.createdPlayer.attack.bonusDice = attack as DiceType;
        }
        if (defense) {
            this.createdPlayer.defense.bonusDice = defense as DiceType;
        }
        this.selectedAttackDice = attack ? (attack as DiceType) : null;
        this.selectedDefenseDice = defense ? (defense as DiceType) : null;
    }

    async submitCharacter(): Promise<void> {
        if (!this.game) {
            this.returnHome();
            return;
        }
        if (!this.isCharacterValid()) return;

        this.accessCodeService.setAccessCode(this.currentAccessCode);

        if (this.isLobbyCreated) {
            const joinResult = await this.characterService.joinExistingLobby(this.currentAccessCode, this.createdPlayer);
            this.handleLobbyJoining(joinResult);
        } else {
            this.createdPlayer.isAdmin = true;
            await this.characterService.createAndJoinLobby(this.game, this.createdPlayer);
            this.submitCharacterForm();
        }
    }

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
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    resetPopup(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    private handleLobbyJoining(joinStatus: string): void {
        switch (joinStatus) {
            case JoinLobbyResult.JoinedLobby:
                this.submitCharacterForm();
                break;
            case JoinLobbyResult.StayInLobby:
                break;
            case JoinLobbyResult.RedirectToHome:
                this.returnHome();
                break;
        }
    }

    private isCharacterValid(): boolean {
        if (!this.characterService.isCharacterValid(this.createdPlayer)) {
            this.characterService.showMissingDetailsError();
            return false;
        }

        return true;
    }

    private submitCharacterForm(): void {
        if (!this.game) {
            return;
        }

        this.characterService.submitCharacter(this.createdPlayer, this.game, () => {
            sessionStorage.setItem('player', JSON.stringify(this.createdPlayer));
            this.resetPopup();
        });
    }

    private returnHome(): void {
        this.closePopup();
        this.characterService.returnHome();
    }
}
