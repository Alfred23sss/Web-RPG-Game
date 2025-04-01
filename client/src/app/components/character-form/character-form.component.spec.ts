import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AttributeType, DiceType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject } from 'rxjs';
import { CharacterFormComponent } from './character-form.component';

describe('CharacterFormComponent', () => {
    let component: CharacterFormComponent;
    let fixture: ComponentFixture<CharacterFormComponent>;
    let mockCharacterService: jasmine.SpyObj<CharacterService>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<CharacterFormComponent>>;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockGame: Game;
    let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;

    beforeEach(async () => {
        mockCharacterService = jasmine.createSpyObj<CharacterService>(
            'CharacterService',
            [
                'initializePlayer',
                'initializeLobby',
                'assignBonus',
                'assignDice',
                'selectAvatar',
                'deselectAvatar',
                'checkCharacterNameLength',
                'submitCharacter',
                'resetAttributes',
                'returnHome',
            ],
            {
                unavailableAvatars$: new BehaviorSubject<string[]>([]).asObservable(),
                onCharacterSubmitted$: new BehaviorSubject<void>(undefined),
                attributes: {
                    [AttributeType.Vitality]: 4,
                    [AttributeType.Speed]: 4,
                    [AttributeType.Attack]: 4,
                    [AttributeType.Defense]: 4,
                },
                bonusAssigned: {
                    [AttributeType.Vitality]: false,
                    [AttributeType.Speed]: false,
                },
                diceAssigned: {
                    [AttributeType.Attack]: false,
                    [AttributeType.Defense]: false,
                },
            },
        );

        mockCharacterService.initializePlayer.and.callFake((player: Player) => {
            player.name = '';
            player.avatar = '';
            player.speed = 4;
            player.attack = { value: 4, bonusDice: DiceType.Uninitialized };
            player.defense = { value: 4, bonusDice: DiceType.Uninitialized };
            player.hp = { current: 4, max: 4 };
            player.movementPoints = 4;
            player.actionPoints = 1;
            player.inventory = [null, null];
            player.isAdmin = false;
            player.hasAbandoned = false;
            player.isActive = false;
            player.combatWon = 0;
        });

        mockDialogRef = jasmine.createSpyObj<MatDialogRef<CharacterFormComponent>>('MatDialogRef', ['close']);
        mockSocketClientService = jasmine.createSpyObj<SocketClientService>('SocketClientService', ['emit', 'on', 'createLobby', 'joinLobby']);
        mockCdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges', 'markForCheck']);

        mockGame = { id: '1', name: 'Test Game' } as Game;

        await TestBed.configureTestingModule({
            imports: [FormsModule, CommonModule, CharacterFormComponent],
            providers: [
                { provide: CharacterService, useValue: mockCharacterService },
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { game: mockGame, accessCode: '1234', isLobbyCreated: true } },
                { provide: SocketClientService, useValue: mockSocketClientService },
                { provide: ChangeDetectorRef, useValue: mockCdr },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call assignBonus on characterService', () => {
        component.assignBonus(AttributeType.Speed);
        expect(mockCharacterService.assignBonus).toHaveBeenCalledWith(component.createdPlayer, AttributeType.Speed);
    });

    it('should call assignDice on characterService', () => {
        component.assignDice(AttributeType.Attack, DiceType.D4);
        expect(mockCharacterService.assignDice).toHaveBeenCalledWith(component.createdPlayer, AttributeType.Attack, DiceType.D4);
    });

    it('should call selectAvatar on characterService', () => {
        component.selectAvatar('AvatarTest');
        expect(mockCharacterService.selectAvatar).toHaveBeenCalledWith(component.createdPlayer, 'AvatarTest', component.currentAccessCode);
    });

    it('should call deselectAvatar on characterService', () => {
        component.deselectAvatar();
        expect(mockCharacterService.deselectAvatar).toHaveBeenCalledWith(component.createdPlayer, component.currentAccessCode);
    });

    it('should call checkCharacterNameLength on characterService and trigger change detection', () => {
        mockCdr.markForCheck.calls.reset();
        mockCdr.detectChanges.calls.reset();
        component.createdPlayer = {
            name: 'TestPlayer',
            avatar: '',
            speed: 4,
            attack: { value: 4, bonusDice: DiceType.Uninitialized },
            defense: { value: 4, bonusDice: DiceType.Uninitialized },
            hp: { current: 4, max: 4 },
            movementPoints: 4,
            actionPoints: 1,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            isActive: false,
            combatWon: 0,
        } as Player;
        component.checkCharacterNameLength();
        expect(mockCharacterService.checkCharacterNameLength).toHaveBeenCalledWith('TestPlayer');
    });

    it('should call returnHome when game is undefined', async () => {
        component.game = undefined;
        await component.submitCharacter();
        expect(mockCharacterService.returnHome).toHaveBeenCalled();
    });

    it('should call submitCharacter on characterService', async () => {
        component.game = mockGame;

        await component.submitCharacter();

        expect(mockCharacterService.submitCharacter).toHaveBeenCalledWith(
            component.createdPlayer,
            component.currentAccessCode,
            component.isLobbyCreated,
            component.game as Game,
        );
    });

    it('should call resetPopup when onCharacterSubmitted$ emits after submitCharacter', async () => {
        spyOn(component, 'resetPopup');

        await component.submitCharacter();

        (mockCharacterService.onCharacterSubmitted$ as BehaviorSubject<void>).next();

        expect(component.resetPopup).toHaveBeenCalled();
    });

    it('should call resetAttributes and close the dialog on resetPopup', () => {
        component.resetPopup();
        expect(mockCharacterService.resetAttributes).toHaveBeenCalled();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should execute resetPopup when submitCharacter completes', async () => {
        spyOn(component, 'resetPopup');
        mockCharacterService.submitCharacter.and.callFake(async () => {
            (mockCharacterService.onCharacterSubmitted$ as BehaviorSubject<void>).next();
        });

        await component.submitCharacter();

        expect(component.resetPopup).toHaveBeenCalled();
    });

    describe('getSegmentCount', () => {
        it('should return half value for Vitality (rounded down)', () => {
            mockCharacterService.attributes[AttributeType.Vitality] = 5;
            const result = component.getSegmentCount(AttributeType.Vitality);
            expect(result).toBe(2);
        });

        it('should return half value for Speed (rounded down)', () => {
            mockCharacterService.attributes[AttributeType.Speed] = 7;
            const result = component.getSegmentCount(AttributeType.Speed);
            expect(result).toBe(3);
        });

        it('should return full value for Attack', () => {
            mockCharacterService.attributes[AttributeType.Attack] = 4;
            const result = component.getSegmentCount(AttributeType.Attack);
            expect(result).toBe(4);
        });

        it('should return full value for Defense', () => {
            mockCharacterService.attributes[AttributeType.Defense] = 6;
            const result = component.getSegmentCount(AttributeType.Defense);
            expect(result).toBe(6);
        });
    });

    describe('getDisplayValue', () => {
        beforeEach(() => {
            component.createdPlayer = {
                attack: { value: 4, bonusDice: DiceType.D6 },
                defense: { value: 4, bonusDice: DiceType.D4 },
            } as Player;
        });

        it('should return value + dice for Attack', () => {
            mockCharacterService.attributes[AttributeType.Attack] = 4;
            const result = component.getDisplayValue(AttributeType.Attack);
            expect(result).toBe('4 + D6');
        });

        it('should return value + dice for Defense', () => {
            mockCharacterService.attributes[AttributeType.Defense] = 5;
            const result = component.getDisplayValue(AttributeType.Defense);
            expect(result).toBe('5 + D4');
        });

        it('should return simple value for Vitality', () => {
            mockCharacterService.attributes[AttributeType.Vitality] = 6;
            const result = component.getDisplayValue(AttributeType.Vitality);
            expect(result).toBe('6');
        });

        it('should return simple value for Speed', () => {
            mockCharacterService.attributes[AttributeType.Speed] = 7;
            const result = component.getDisplayValue(AttributeType.Speed);
            expect(result).toBe('7');
        });
    });

    describe('getDiceValue', () => {
        beforeEach(() => {
            component.createdPlayer = {
                attack: { bonusDice: DiceType.D6 },
                defense: { bonusDice: DiceType.D4 },
            } as Player;
        });

        it('should return attack bonus dice when attribute is Attack', () => {
            const result = component.getDiceValue(AttributeType.Attack);
            expect(result).toBe(DiceType.D6);
        });

        it('should return defense bonus dice when attribute is Defense', () => {
            const result = component.getDiceValue(AttributeType.Defense);
            expect(result).toBe(DiceType.D4);
        });

        it('should return D4 as default for other attributes', () => {
            const result = component.getDiceValue(AttributeType.Vitality);
            expect(result).toBe(DiceType.D4);
        });
    });

    describe('handleKeyDown', () => {
        it('should call closePopup when Escape key is pressed', () => {
            spyOn(component, 'closePopup');
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            component['handleKeyDown'](escapeEvent);
            expect(component.closePopup).toHaveBeenCalled();
        });

        it('should not call closePopup when other keys are pressed', () => {
            spyOn(component, 'closePopup');
            const otherKeyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            component['handleKeyDown'](otherKeyEvent);
            expect(component.closePopup).not.toHaveBeenCalled();
        });
    });
});
