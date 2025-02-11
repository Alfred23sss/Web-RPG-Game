import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS, ATTRIBUTE_TYPES, DICE_TYPES } from '@app/constants/global.constants';
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
    selectedAttackDice: string | null = null;
    selectedDefenseDice: string | null = null;
    xSword = GameDecorations.XSwords;
    game: Game;

    avatarTypes = Object.values(AvatarType).filter((value) => value !== AvatarType.Default);

    attributes = this.characterService.attributes;
    bonusAssigned = this.characterService.bonusAssigned;
    diceAssigned = this.characterService.diceAssigned;

    protected attributeKeys = ATTRIBUTE_KEYS;
    protected attributeTypes = ATTRIBUTE_TYPES;
    protected diceTypes = DICE_TYPES;

    constructor(
        // private router: Router,
        private dialogRef: MatDialogRef<CharacterFormComponent>,
        private characterService: CharacterService,
        @Inject(MAT_DIALOG_DATA) public data: { game: Game },
    ) {
        this.game = data.game;
    }

    assignBonus(attribute: string) {
        this.characterService.assignBonus(attribute);
    }

    assignDice(attribute: string, dice: string) {
        const { attack, defense } = this.characterService.assignDice(attribute, dice, this.selectedAttackDice, this.selectedDefenseDice);
        this.selectedAttackDice = attack;
        this.selectedDefenseDice = defense;
    }

    submitCharacter(): void {
        this.characterService.submitCharacter(this.characterName, this.selectedAvatar, this.game, this.isBonusAssigned(), this.isDiceAssigned(), () =>
            this.closePopup(),
        );
    }

    closePopup(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    private isBonusAssigned(): boolean {
        return this.bonusAssigned.vitality || this.bonusAssigned.speed;
    }

    private isDiceAssigned(): boolean {
        return this.diceAssigned.attack || this.diceAssigned.defense;
    }
}
