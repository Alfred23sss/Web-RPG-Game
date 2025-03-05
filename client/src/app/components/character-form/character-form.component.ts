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

    unavailableNames: string[] = []; //AJOUT2!!!!!
    unavailableAvatars: string[] = []; //AJOUT2!!!!!!!
    errorMessage: string = ''; //AJOUT2!!!!!!!!!

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
        this.socketClientService.onUpdateUnavailableOptions((data: { names: string[], avatars: string[] }) => {
            console.log('🔴 Réception des noms indisponibles:', data);
            this.unavailableNames = data.names;
            this.unavailableAvatars = data.avatars;
        });
    
        // this.socketClientService.onSelectionError((message: string) => {
        //     console.log('❌ Erreur de sélection:', message);
        //     this.errorMessage = message;
        //     this.snackbarService.showMessage(message);
        // });
    
        this.socketClientService.onJoinError((message: string) => {
            console.log('❌ Erreur en rejoignant la partie:', message);
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
            console.log('❌ Game is missing, returning');
            return;
        }
    
        if (this.unavailableNames.includes(this.createdPlayer.name)) {
            console.log('❌ Nom déjà pris côté client, on arrête ici et on NE REDIRIGE PAS');
            this.snackbarService.showMessage('⚠️ Ce nom est déjà utilisé !');
            return; // 🚨 STOP ici !
        }
    
        if (!this.characterService.isCharacterValid(this.createdPlayer)) {
            console.log('❌ Caractère invalide, affichage erreur');
            this.characterService.showMissingDetailsError();
            return;
        }
    
        console.log('✅ Nom valide, on continue la soumission');
    
        this.accessCodeService.setAccessCode(this.currentAccessCode);
    
        // 🔹 Attendre la réponse du serveur avant d'autoriser la redirection
        try {
            const joinSuccess = await this.tryJoinLobby();
    
            if (!joinSuccess) {
                console.log('❌ Une erreur a été détectée, ANNULATION de la fermeture du popup et de la redirection');
                return; // 🚨 NE PAS continuer si une erreur a été reçue
            }
    
            console.log('✅ Aucun problème détecté, on continue');
    
            this.characterService.submitCharacter(
                this.createdPlayer,
                this.game,
                () => {
                    console.log('✅ Validation réussie, on ferme le popup');
                    sessionStorage.setItem('player', JSON.stringify(this.createdPlayer));
    
                    if (this.unavailableNames.includes(this.createdPlayer.name)) {
                        console.log('❌ Nom encore pris après validation, on ANNULE la fermeture du popup');
                        return; // 🚨 STOP ici !
                    }
    
                    this.closePopup();
                },
                this.unavailableNames
            );
        } catch (error) {
            console.log('❌ Exception capturée lors de la tentative de connexion au lobby:', error);
            return;
        }
    }
    async tryJoinLobby(): Promise<boolean> {
        return new Promise((resolve) => {
            this.socketClientService.onJoinError((message: string) => {
                console.log('❌ Erreur détectée en rejoignant (serveur) :', message);
                this.snackbarService.showMessage(message);
                resolve(false); // 🚨 On empêche `submitCharacter()` de continuer
            });
    
            this.socketClientService.onJoinLobby(() => {
                console.log('✅ Connexion réussie au lobby');
                resolve(true); // ✅ Permet à `submitCharacter()` de continuer
            });
    
            if (this.isLobbyCreated) {
                console.log('✅ Envoi de la demande pour rejoindre un lobby existant');
                this.characterService.joinExistingLobby(this.currentAccessCode, this.createdPlayer);
            } else {
                if (!this.game) {
                    console.log('❌ Impossible de créer un lobby : game est undefined');
                    this.snackbarService.showMessage("❌ Erreur : Impossible de créer le lobby (données invalides).");
                    resolve(false);
                    return;
                }
    
                console.log('✅ Envoi de la demande pour créer un nouveau lobby');
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
        console.log('🔴 Fermeture du popup demandée');
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }
    
    // private returnHome(): void {
    //     this.characterService.resetAttributes();
    //     this.dialogRef.close();
    //     this.characterService.returnHome();
    // }

    updateSelection(): void {
        if (!this.createdPlayer.name || !this.createdPlayer.avatar) return;

        if (this.unavailableNames.includes(this.createdPlayer.name)) {
            this.snackbarService.showMessage('⚠️ Ce nom est déjà pris !');
            return;
        }

        if (this.unavailableAvatars.includes(this.createdPlayer.avatar)) {
            this.snackbarService.showMessage('⚠️ Cet avatar est déjà pris !');
            return;
        }

        console.log('🟡 Envoi de la mise à jour de sélection au serveur:', this.createdPlayer);

        this.socketClientService.emit('updatePlayerSelection', {
            accessCode: this.currentAccessCode,
            player: this.createdPlayer,
        });
    }

    checkNameAvailability(): void {
        if (this.unavailableNames.includes(this.createdPlayer.name)) {
            this.snackbarService.showMessage('Ce ');
        }
    }
}
