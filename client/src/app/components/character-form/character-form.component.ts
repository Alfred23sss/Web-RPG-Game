import { CommonModule } from '@angular/common'; // ✅ Ajoute ceci
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, AvatarType, DiceType, GameDecorations } from '@app/enums/global.enums';
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
export class CharacterFormComponent {
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

    protected attributeKeys = ATTRIBUTE_KEYS;
    protected attributeTypes = AttributeType;
    protected diceTypes = DiceType;

    unavailableNames: string[] = []; 
    unavailableAvatars: string[] = []; 
    errorMessage: string = ''; 

    constructor(
        private readonly dialogRef: MatDialogRef<CharacterFormComponent>,
        private readonly characterService: CharacterService,
        private readonly accessCodeService: AccessCodeService,
        private readonly socketClientService: SocketClientService,
        private readonly snackbarService: SnackbarService,
        @Inject(MAT_DIALOG_DATA) public data: { game: Game; accessCode: string; isLobbyCreated: boolean; createdPlayer: Player }, // Correction de `MAT_DIALOG_DATA` pour s'assurer que `game` est bien incluss
    ) {
        this.game = data.game; // undef for multiple clients except original
        this.isLobbyCreated = data.isLobbyCreated;
        this.currentAccessCode = data.accessCode;
        this.createdPlayer = data.createdPlayer ?? {
            // voir si je ne peux pas directement les initialiser dans l'interface comme ca chawue joureru que j ecris aura les attribus par defaut
            name: '',
            avatar: '',
            speed: 4,
            vitality: 4,
            attack: { value: 4, bonusDice: DiceType.Uninitialized },
            defense: { value: 4, bonusDice: DiceType.Uninitialized },
            hp: { current: 10, max: 10 },
            movementPoints: 3,
            actionPoints: 3,
            inventory: [null, null],
        }; // needs to be default player ??
    }

    ngOnInit(): void {
        this.socketClientService.onUpdateUnavailableOptions((data: { names: string[]; avatars: string[] }) => {
            this.unavailableNames = data.names;
            this.unavailableAvatars = data.avatars;
        });

        this.socketClientService.onJoinError((message: string) => {
            this.errorMessage = message;
            this.snackbarService.showMessage(message);
            // NE PAS REDIRIGER VERS WAITING-VIEW
        });
    }

    assignBonus(attribute: AttributeType) {
        this.characterService.assignBonus(attribute);
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
        if (!this.characterService.isCharacterValid(this.createdPlayer)) {
            this.characterService.showMissingDetailsError();
            return;
        }
        this.accessCodeService.setAccessCode(this.currentAccessCode);

        const joinSuccess = await this.tryJoinLobby();

        if (!joinSuccess) {
            return;
        }

        this.characterService.submitCharacter(this.createdPlayer, this.game, () => {
            sessionStorage.setItem('player', JSON.stringify(this.createdPlayer));

            if (this.unavailableNames.includes(this.createdPlayer.name)) {
                return;
            }

            this.closePopup();
        });
    }
    async tryJoinLobby(): Promise<boolean> {
        return new Promise((resolve) => {
            this.socketClientService.onJoinError((message: string) => {
                this.snackbarService.showMessage(message);
                resolve(false);
            });

            this.socketClientService.onJoinLobby(() => {
                resolve(true);
            });

            if (this.isLobbyCreated) {
                this.characterService.joinExistingLobby(this.currentAccessCode, this.createdPlayer);
            } else {
                if (!this.game) {
                    resolve(false);
                    return;
                }
                this.createdPlayer.isAdmin = true;
                this.characterService.createAndJoinLobby(this.game, this.createdPlayer);
            }
        });
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

    private returnHome(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
        this.characterService.returnHome();
    }

    checkNameAvailability(): void {
        if (this.unavailableNames.includes(this.createdPlayer.name)) {
            this.snackbarService.showMessage('Ce ');
        }
    }
}
