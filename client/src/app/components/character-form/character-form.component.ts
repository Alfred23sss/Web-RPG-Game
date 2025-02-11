import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, DiceType } from '@app/enums/global.enums';

import { Game } from '@app/interfaces/game';
import { AvatarType, GameDecorations } from '@app/interfaces/images';
import { CharacterService } from '@app/services/character-form/character-form.service';

@Component({
    selector: 'app-character-form',
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.scss'],
    imports: [FormsModule],
})
export class CharacterFormComponent {
    characterName = '';
    selectedAvatar = '';
    showForm = true;
    selectedAttackDice: DiceType | null = null;
    selectedDefenseDice: DiceType | null = null;
    xSword = GameDecorations.XSwords;
    game: Game;

    avatarTypes = Object.values(AvatarType).filter((value) => value !== AvatarType.Default);

    attributes = this.characterService.attributes;
    bonusAssigned = this.characterService.bonusAssigned;
    diceAssigned = this.characterService.diceAssigned;

    protected attributeKeys = ATTRIBUTE_KEYS;
    // protected attributeTypes = ATTRIBUTE_TYPES;
    // protected diceTypes = DICE_TYPES;
    protected attributeTypes = AttributeType;
    protected diceTypes = DiceType;

    constructor(
        private readonly dialogRef: MatDialogRef<CharacterFormComponent>,
        private readonly characterService: CharacterService,
        @Inject(MAT_DIALOG_DATA) public data: { game: Game },
    ) {
        this.game = data.game;
    }

    assignBonus(attribute: AttributeType) {
        this.characterService.assignBonus(attribute);
    }

    assignDice(attribute: AttributeType) {
        const { attack, defense } = this.characterService.assignDice(attribute);
        // this.selectedAttackDice = attack;
        this.selectedAttackDice = attack as DiceType;
        this.selectedDefenseDice = defense as DiceType;
        // this.selectedDefenseDice = defense;
    }

    submitCharacter(): void {
        this.characterService.submitCharacter({
            characterName: this.characterName,
            selectedAvatar: this.selectedAvatar,
            game: this.game,
            isBonusAssigned: this.isBonusAssigned(),
            isDiceAssigned: this.isDiceAssigned(),
            closePopup: () => this.closePopup(),
        });
    }

    checkCharacterNameLength(): void {
        this.characterService.checkCharacterNameLength(this.characterName);
    }
    closePopup(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }
    private isBonusAssigned(): boolean {
        // return this.bonusAssigned.vitality || this.bonusAssigned.speed;
        return this.bonusAssigned[AttributeType.VITALITY] || this.bonusAssigned[AttributeType.SPEED];
    }

    private isDiceAssigned(): boolean {
        // return this.diceAssigned.attack || this.diceAssigned.defense;
        return this.diceAssigned[AttributeType.ATTACK] || this.diceAssigned[AttributeType.DEFENSE];
    }
}
