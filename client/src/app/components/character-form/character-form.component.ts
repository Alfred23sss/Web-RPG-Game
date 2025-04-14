import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ATTRIBUTE_KEYS } from '@app/constants/global.constants';
import { AttributeType, DiceType } from '@app/enums/global.enums';
import { CharacterDialogData } from '@app/interfaces/character-dialog-data';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Subscription } from 'rxjs';
import { GameDecorations, AvatarType } from '@common/enums';

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
    createdPlayer: Player = {} as Player;
    avatarTypes: string[] = Object.values(AvatarType);
    attributes = this.characterService.attributes;
    bonusAssigned = this.characterService.bonusAssigned;
    diceAssigned = this.characterService.diceAssigned;
    unavailableAvatars: string[] = [];

    protected attributeKeys = ATTRIBUTE_KEYS;
    protected attributeTypes = AttributeType;
    protected diceTypes = DiceType;
    private readonly subscriptions = new Subscription();

    constructor(
        private readonly dialogRef: MatDialogRef<CharacterFormComponent>,
        private readonly characterService: CharacterService,
        private readonly socketClientService: SocketClientService,
        private readonly cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: CharacterDialogData,
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
        this.subscriptions.add(
            this.characterService.onCharacterSubmitted$.subscribe(() => {
                this.resetPopup();
            }),
        );

        document.addEventListener('keydown', this.handleKeyDown);
    }

    assignBonus(attribute: AttributeType): void {
        this.characterService.assignBonus(this.createdPlayer, attribute);
    }

    assignDice(attribute: AttributeType, diceType: DiceType): void {
        this.characterService.assignDice(this.createdPlayer, attribute, diceType);
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
        await this.characterService.submitCharacter(this.createdPlayer, this.currentAccessCode, this.isLobbyCreated, this.game);
    }

    closePopup(): void {
        this.createdPlayer.name = '';
        this.characterService.deselectAvatar(this.createdPlayer, this.currentAccessCode);
        this.socketClientService.emit('manualDisconnect', {
            isInGame: false,
        });
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    resetPopup(): void {
        this.characterService.resetAttributes();
        this.dialogRef.close();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    getSegmentCount(attribute: AttributeType): number {
        if (attribute === AttributeType.Vitality || attribute === AttributeType.Speed) {
            return Math.floor(this.attributes[attribute] / 2);
        }
        return this.attributes[attribute];
    }

    getDisplayValue(attribute: AttributeType): string {
        const value = this.attributes[attribute];
        if (attribute === AttributeType.Attack || attribute === AttributeType.Defense) {
            return `${value} + ${this.getDiceValue(attribute)}`;
        }
        return value.toString();
    }

    getDiceValue(attribute: AttributeType): DiceType {
        if (attribute === AttributeType.Attack) {
            return this.createdPlayer.attack.bonusDice;
        } else if (attribute === AttributeType.Defense) {
            return this.createdPlayer.defense.bonusDice;
        }
        return DiceType.D4;
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            this.closePopup();
        }
    };

    private returnHome(): void {
        this.closePopup();
        this.characterService.returnHome();
    }
}
