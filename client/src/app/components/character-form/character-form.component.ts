import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, AvatarType, DiceType, GameDecorations } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { RoomValidationService } from '@app/services/room-validation/room-validation.service';
@Component({
    selector: 'app-character-form',
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.scss'],
    standalone: true,
    imports: [FormsModule],
})
export class CharacterFormComponent {
    showForm: boolean = true;
    xSword: string = GameDecorations.XSwords;

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

    constructor(
        private readonly dialogRef: MatDialogRef<CharacterFormComponent>,
        private readonly characterService: CharacterService,
        private readonly roomValidationService: RoomValidationService,
        @Inject(MAT_DIALOG_DATA) public data: { game: Game; createdPlayer: Player }, // Correction de `MAT_DIALOG_DATA` pour s'assurer que `game` est bien incluss
    ) {
        this.game = data.game;
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
        };
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

    submitCharacter(): void {
        if (!this.game) {
            this.proceedToWaitingView();
            return;
        }

        if (this.characterService.isCharacterValid(this.createdPlayer)) {
            this.roomValidationService.joinGame(this.game, this.createdPlayer);
            this.characterService.submitCharacter(this.createdPlayer, this.game, () => this.closePopup());
        } else {
            this.characterService.showMissingDetailsError();
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

    private proceedToWaitingView(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
        this.characterService.goToWaitingView();
    }
}
