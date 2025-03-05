import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AttributeType, DiceType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { CharacterFormComponent } from './character-form.component';

describe('CharacterFormComponent', () => {
    let component: CharacterFormComponent;
    let fixture: ComponentFixture<CharacterFormComponent>;
    let mockCharacterService: jasmine.SpyObj<CharacterService>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<CharacterFormComponent>>;
    let mockGame: Game;

    beforeEach(async () => {
        mockCharacterService = jasmine.createSpyObj<CharacterService>(
            'CharacterService',
            [
                'submitCharacter',
                'resetAttributes',
                'assignBonus',
                'assignDice',
                'checkCharacterNameLength',
                'isCharacterValid',
                'showMissingDetailsError',
            ],
            {
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

        mockDialogRef = jasmine.createSpyObj<MatDialogRef<CharacterFormComponent>>('MatDialogRef', ['close']);
        mockGame = { id: '1', name: 'Test Game' } as Game;

        await TestBed.configureTestingModule({
            imports: [FormsModule, CharacterFormComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: CharacterService, useValue: mockCharacterService },
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { game: mockGame, accessCode: '1234', isLobbyCreated: true } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call assignBonus from CharacterService with the correct attribute', () => {
        const attribute: AttributeType = AttributeType.Vitality;
        component.assignBonus(attribute);
        expect(mockCharacterService.assignBonus).toHaveBeenCalledWith(attribute);
    });

    it('should update createdPlayer.hp when assigning bonus to Vitality', () => {
        const attribute: AttributeType = AttributeType.Vitality;
        const expectedHpIncrease = 2;
        component.assignBonus(attribute);
        expect(component.createdPlayer.hp.max).toBe(mockCharacterService.attributes[AttributeType.Vitality] + expectedHpIncrease);
        expect(component.createdPlayer.hp.current).toBe(mockCharacterService.attributes[AttributeType.Vitality] + expectedHpIncrease);
    });

    it('should update createdPlayer.speed when assigning bonus to Speed', () => {
        const attribute: AttributeType = AttributeType.Speed;
        const expectedSpeedIncrease = 2;
        component.assignBonus(attribute);
        expect(component.createdPlayer.speed).toBe(mockCharacterService.attributes[AttributeType.Speed] + expectedSpeedIncrease);
    });

    it('should call assignDice from CharacterService and update selected dice values', () => {
        const attribute: AttributeType = AttributeType.Attack;
        mockCharacterService.assignDice.and.returnValue({ attack: DiceType.D6, defense: DiceType.D4 });
        component.assignDice(attribute);
        expect(mockCharacterService.assignDice).toHaveBeenCalledWith(attribute);
        expect(component.createdPlayer.attack.bonusDice).toBe(DiceType.D6);
        expect(component.selectedAttackDice).toBe(DiceType.D6);
    });

    it('should call submitCharacter and closePopup when valid', async () => {
        spyOn(component, 'closePopup');
        mockCharacterService.isCharacterValid.and.returnValue(true);
        mockCharacterService.submitCharacter.and.callFake((player, game, callback) => {
            callback();
        });

        component.game = mockGame;
        await component.submitCharacter();

        expect(mockCharacterService.isCharacterValid).toHaveBeenCalled();
        expect(mockCharacterService.submitCharacter).toHaveBeenCalled();
        expect(component.closePopup).toHaveBeenCalled();
    });

    it('should not submit character if invalid', async () => {
        spyOn(component, 'closePopup');
        mockCharacterService.isCharacterValid.and.returnValue(false);
        await component.submitCharacter();
        expect(mockCharacterService.submitCharacter).not.toHaveBeenCalled();
        expect(component.closePopup).not.toHaveBeenCalled();
    });

    it('should close popup when closePopup is called', () => {
        component.closePopup();
        expect(mockCharacterService.resetAttributes).toHaveBeenCalled();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should show an error if the character name is unavailable', () => {
        component.unavailableNames = ['TakenName'];
        component.createdPlayer.name = 'TakenName';
        const isValid = component['isCharacterValid']();
        expect(isValid).toBeFalse();
        expect(mockCharacterService.showMissingDetailsError).not.toHaveBeenCalled();
    });

    it('should show an error if the avatar is unavailable', () => {
        component.unavailableAvatars = ['Avatar1'];
        component.createdPlayer.avatar = 'Avatar1';
        const isValid = component['isCharacterValid']();
        expect(isValid).toBeFalse();
    });
});
