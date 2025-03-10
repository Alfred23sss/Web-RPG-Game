import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
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
    imports: [FormsModule, CommonModule],
})
export class CharacterFormComponent implements OnInit {
    showForm: boolean = true;
    xSword: string = GameDecorations.XSwords;
    isLobbyCreated: boolean;
    currentAccessCode: string;
    game?: Game; // repasser dessus et voir si ca marche meme sans le !!!!!!!
    createdPlayer: Player;
    selectedAttackDice: DiceType | null = null;
    selectedDefenseDice: DiceType | null = null;
    avatarTypes: string[] = Object.values(AvatarType);

    attributes = this.characterService.attributes;
    bonusAssigned = this.characterService.bonusAssigned;
    diceAssigned = this.characterService.diceAssigned;

    unavailableNames: string[] = [];
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
        @Inject(MAT_DIALOG_DATA) public data: { game: Game; accessCode: string; isLobbyCreated: boolean }, // Correction de `MAT_DIALOG_DATA` pour s'assurer que `game` est bien incluss
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
            movementPoints: 3,
            actionPoints: 3,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            isActive: false,
            combatWon: 0,
        };
    }

    ngOnInit(): void {
        this.socketClientService.emit('requestUnavailableOptions', this.currentAccessCode);

        this.socketClientService.onUpdateUnavailableOptions((data: { names: string[]; avatars: string[] }) => {
            this.unavailableNames = [...data.names];
            this.unavailableAvatars = [...data.avatars];
        });
    }

    assignBonus(attribute: AttributeType): void {
        this.characterService.assignBonus(attribute);
        if (attribute === AttributeType.Vitality) {
            this.createdPlayer.hp.current = this.createdPlayer.hp.max = this.characterService.attributes[AttributeType.Vitality];
        } else if (attribute === AttributeType.Speed) {
            this.createdPlayer.speed = this.characterService.attributes[AttributeType.Speed];
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
            console.log(this.createdPlayer);
            this.submitCharacterForm();
        }
    }

    checkCharacterNameLength(): void {
        if (this.createdPlayer) {
            this.characterService.checkCharacterNameLength(this.createdPlayer.name);
        }
    }

    closePopup(): void {
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

        if (this.unavailableNames.includes(this.createdPlayer.name)) {
            this.snackbarService.showMessage('Ce nom est déjà utilisé !');
            return false;
        }
        if (this.unavailableAvatars.includes(this.createdPlayer.avatar)) {
            this.snackbarService.showMessage('Cet avatar est déjà pris !');
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
            this.closePopup();
        });
    }

    private returnHome(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
        this.characterService.returnHome();
    }
}
