import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, AvatarType, DiceType, GameDecorations } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';


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

    unavailableNames: string[] = []; //AJOUT2!!!!!
    unavailableAvatars: string[] = [];//AJOUT2!!!!!!!
    errorMessage: string = '';//AJOUT2!!!!!!!!!
    


    constructor(
        private readonly dialogRef: MatDialogRef<CharacterFormComponent>,
        private readonly characterService: CharacterService,
        private readonly accessCodeService: AccessCodeService,
        private readonly socketClientService: SocketClientService,
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
        this.socketClientService.onUpdateUnavailableOptions((data: { names: string[], avatars: string[] }) => {
            console.log('🔴 Réception des noms et avatars indisponibles:', data);
            this.unavailableNames = data.names;
            this.unavailableAvatars = data.avatars;
        });
    
        this.socketClientService.onSelectionError((message: string) => {
            console.log('❌ Erreur de sélection:', message);
            this.errorMessage = message;
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
            console.log('game failed in charceter form');
            this.returnHome();
            return;
        }

        if (this.characterService.isCharacterValid(this.createdPlayer)) {
            this.accessCodeService.setAccessCode(this.currentAccessCode);

            if (this.isLobbyCreated) {
                console.log('joining Lobby in c form');
                this.characterService.joinExistingLobby(this.currentAccessCode, this.createdPlayer);
                console.log('joined Lobby in c form');
            } else {
                this.createdPlayer.isAdmin = true;
                await this.characterService.createAndJoinLobby(this.game, this.createdPlayer);
            }
            this.characterService.submitCharacter(this.createdPlayer, this.game, () => {
                sessionStorage.setItem('player', JSON.stringify(this.createdPlayer));
                this.closePopup();
            });
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
    private returnHome(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
        this.characterService.returnHome();
    }

    updateSelection(): void {
        if (!this.createdPlayer.name || !this.createdPlayer.avatar) return;
    
        console.log('🟡 Envoi de la mise à jour de sélection au serveur:', this.createdPlayer);
    
        this.socketClientService.emit('updatePlayerSelection', {
            accessCode: this.currentAccessCode,
            player: this.createdPlayer,
        });
    }
    
    
}
