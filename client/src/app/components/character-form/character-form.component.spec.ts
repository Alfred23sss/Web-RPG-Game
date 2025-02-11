import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
            ['submitCharacter', 'resetAttributes', 'assignBonus', 'assignDice'],
            {
                attributes: { vitality: 5, speed: 5 },
                bonusAssigned: { vitality: false, speed: false },
                diceAssigned: { attack: false, defense: false },
            },
        );
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockGame = { id: '1', name: 'Test Game' } as Game;
        await TestBed.configureTestingModule({
            imports: [FormsModule, CharacterFormComponent],
            providers: [
                { provide: CharacterService, useValue: mockCharacterService },
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { game: mockGame } },
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
        const attribute = 'vitality';
        component.assignBonus(attribute);
        expect(mockCharacterService.assignBonus).toHaveBeenCalledWith(attribute);
    });

    it('should call assignDice from CharacterService and update selected dice values', () => {
        const attribute = 'attack';
        mockCharacterService.assignDice.and.returnValue({ attack: 'D6', defense: 'D4' });
        component.assignDice(attribute);
        expect(mockCharacterService.assignDice).toHaveBeenCalledWith(attribute);
    });

    it('should call submitCharacter from CharacterService and closePopup when the callback is executed', () => {
        spyOn(component, 'closePopup');

        component.submitCharacter();
        expect(mockCharacterService.submitCharacter).toHaveBeenCalled();

        const dataPassed = mockCharacterService.submitCharacter.calls.mostRecent().args[0];
        dataPassed.closePopup();

        expect(component.closePopup).toHaveBeenCalled();
    });

    it('should reset attributes and close dialog when closePopup() is called', () => {
        component.closePopup();

        expect(mockCharacterService.resetAttributes).toHaveBeenCalled();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });
});
