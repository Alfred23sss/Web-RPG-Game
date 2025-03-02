import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AttributeType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { RoomValidationService } from '@app/services/room-validation/room-validation.service';
import { CharacterFormComponent } from './character-form.component';

describe('CharacterFormComponent', () => {
    let component: CharacterFormComponent;
    let fixture: ComponentFixture<CharacterFormComponent>;
    let mockCharacterService: jasmine.SpyObj<CharacterService>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<CharacterFormComponent>>;
    let mockGame: Game;
    let mockRoomValidationService: jasmine.SpyObj<RoomValidationService>;

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
                    [AttributeType.Vitality]: 5,
                    [AttributeType.Speed]: 5,
                    [AttributeType.Attack]: 5,
                    [AttributeType.Defense]: 5,
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
        mockRoomValidationService = jasmine.createSpyObj<RoomValidationService>('RoomValidationService', ['joinGame']);

        mockGame = { id: '1', name: 'Test Game' } as Game;
        // await TestBed.configureTestingModule({
        //     imports: [FormsModule, CharacterFormComponent],
        //     providers: [
        //         provideHttpClient(),
        //         { provide: CharacterService, useValue: mockCharacterService },
        //         { provide: MatDialogRef, useValue: mockDialogRef },
        //         { provide: MAT_DIALOG_DATA, useValue: { game: mockGame } },
        //     ],
        // }).compileComponents();

        await TestBed.configureTestingModule({
            imports: [FormsModule, CharacterFormComponent],
            providers: [
                provideHttpClient(), // Provides HttpClient
                provideHttpClientTesting(), // Provides HttpClientTestingController
                { provide: CharacterService, useValue: mockCharacterService },
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { game: mockGame } },
                { provide: RoomValidationService, useValue: mockRoomValidationService },
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

    it('should call assignDice from CharacterService and update selected dice values', () => {
        const attribute: AttributeType = AttributeType.Attack;
        mockCharacterService.assignDice.and.returnValue({ attack: 'D6', defense: 'D4' });
        component.assignDice(attribute);
        expect(mockCharacterService.assignDice).toHaveBeenCalledWith(attribute);
    });

    it('should call submitCharacter from CharacterService and closePopup when the callback is executed', () => {
        spyOn(component, 'closePopup');
        mockCharacterService.isCharacterValid.and.returnValue(true);
        mockCharacterService.submitCharacter.and.callFake((player, game, callback) => {
            callback();
        });
        mockRoomValidationService.joinGame.and.returnValue();
        component.game = mockGame;
        component.submitCharacter();
        expect(mockCharacterService.submitCharacter).toHaveBeenCalledWith(component.createdPlayer, mockGame, jasmine.any(Function));
        expect(component.closePopup).toHaveBeenCalled();
    });

    it('should call checkCharacterNameLength from CharacterService when updateCharacterName is called', () => {
        component.createdPlayer.name = 'ValidName';
        component.checkCharacterNameLength();
        expect(mockCharacterService.checkCharacterNameLength).toHaveBeenCalledWith('ValidName');
    });
});
