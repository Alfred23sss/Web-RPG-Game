import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, AvatarType, DiceType, GameDecorations } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { PlayerInfo } from '@app/interfaces/player';
import { CharacterService } from '@app/services/character-form/character-form.service';

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
    createdPlayer: PlayerInfo;
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
        @Inject(MAT_DIALOG_DATA) public data: { game: Game; createdPlayer: PlayerInfo }, // Correction de `MAT_DIALOG_DATA` pour s'assurer que `game` est bien incluss
    ) {
        this.game = data.game;
        this.createdPlayer = data.createdPlayer ?? {
            //voir si je ne peux pas directement les initialiser dans l'interface comme ca chawue joureru que j ecris aura les attribus par defaut
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
    
        if (attribute === AttributeType.Vitality) {
            this.createdPlayer.vitality = this.characterService.attributes[AttributeType.Vitality];
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

    // submitCharacter(): void {
    //     console.log('🔍 Vérification avant soumission :', this.createdPlayer);

    //     if (this.createdPlayer && this.characterService.isCharacterValid(this.createdPlayer)) {
    //         this.characterService.submitCharacter(this.createdPlayer, this.game, () => this.closePopup());
    //     } else {
    //         this.characterService.showMissingDetailsError();
    //     }
    // }

    submitCharacter(): void {
        console.log('🔍 Vérification avant soumission :', this.createdPlayer);

        if (!this.game) {
            //mettre la logique de verification de code 4 chiffres a la place de ca
            console.warn('⚠ Aucun jeu trouvé. Redirection vers la Waiting View...');
            this.proceedToWaitingView(); // ✅ Redirige vers la Waiting View sans soumettre
            return;
        }

        if (this.characterService.isCharacterValid(this.createdPlayer)) {
            this.characterService.submitCharacter(this.createdPlayer, this.game, () => this.closePopup());
        } else {
            this.characterService.showMissingDetailsError();
        }
    }

    private proceedToWaitingView(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
        this.characterService.goToWaitingView();
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
}
