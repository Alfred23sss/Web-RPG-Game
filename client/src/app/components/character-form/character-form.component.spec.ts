import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { ATTRIBUTE_TYPES, DICE_TYPES, ERROR_MESSAGES, ROUTES } from '../../constants/global.constants';
import { CharacterFormComponent } from './character-form.component';

const DEFAULT_ATTRIBUTE_VALUE = 4;
const BONUS_ATTRIBUTE_VALUE = 6;

describe('CharacterFormComponent', () => {
    let component: CharacterFormComponent;
    let fixture: ComponentFixture<CharacterFormComponent>;
    let mockDialogRef: MatDialogRef<CharacterFormComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let snackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialog', ['close']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [FormsModule, MatDialogModule, RouterModule.forRoot([]), CharacterFormComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: Router, useValue: mockRouter },
                { provide: MatSnackBar, useValue: snackBar },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize attributes correctly', () => {
        Object.values(ATTRIBUTE_TYPES).forEach((attribute) => {
            expect(component.attributes[attribute]).toBe(DEFAULT_ATTRIBUTE_VALUE);
        });
    });

    it('should assign bonus and reset the other attribute', () => {
        [ATTRIBUTE_TYPES.VITALITY, ATTRIBUTE_TYPES.SPEED].forEach((attribute) => {
            const otherAttribute = attribute === ATTRIBUTE_TYPES.VITALITY ? ATTRIBUTE_TYPES.SPEED : ATTRIBUTE_TYPES.VITALITY;

            component.assignBonus(attribute);
            expect(component.attributes[attribute]).toBe(BONUS_ATTRIBUTE_VALUE);
            expect(component.bonusAssigned[attribute]).toBe(true);
            expect(component.attributes[otherAttribute]).toBe(DEFAULT_ATTRIBUTE_VALUE);
            expect(component.bonusAssigned[otherAttribute]).toBe(false);
        });
    });

    it('should toggle dice assignment correctly', () => {
        [ATTRIBUTE_TYPES.ATTACK, ATTRIBUTE_TYPES.DEFENSE].forEach((attribute) => {
            const otherAttribute = attribute === ATTRIBUTE_TYPES.ATTACK ? ATTRIBUTE_TYPES.DEFENSE : ATTRIBUTE_TYPES.ATTACK;

            [DICE_TYPES.D4, DICE_TYPES.D6].forEach((dice) => {
                component.assignDice(attribute, dice);
                expect(component.selectedAttackDice).toBe(attribute === ATTRIBUTE_TYPES.ATTACK ? dice : component.selectedAttackDice);
                expect(component.selectedDefenseDice).toBe(attribute === ATTRIBUTE_TYPES.DEFENSE ? dice : component.selectedDefenseDice);
                expect(component.diceAssigned[attribute]).toBe(true);
                expect(component.diceAssigned[otherAttribute]).toBe(false);
            });
        });
    });

    it('should display a snackbar message if the form is incomplete', () => {
        component.characterName = '';
        component.selectedAvatar = '';
        component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = false;
        component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = false;
        component.submitCharacter();

        expect(snackBar.open).toHaveBeenCalledWith(ERROR_MESSAGES.MISSING_CHARACTER_DETAILS, 'Close', { duration: 3000 });
    });

    it('should navigate to waiting-view when form is valid', () => {
        component.characterName = 'Test Character';
        component.selectedAvatar = 'assets/avatars/avatar1.png';
        component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = true;
        component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = true;
        component.submitCharacter();

        expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.WAITING_VIEW]);
    });

    it('should close the dialog when closePopup is called', () => {
        component.closePopup();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should not navigate if any required field is missing', () => {
        const invalidCases = [
            { characterName: '', selectedAvatar: 'avatar.png', bonus: true, dice: true },
            { characterName: 'Test', selectedAvatar: '', bonus: true, dice: true },
            { characterName: 'Test', selectedAvatar: 'avatar.png', bonus: false, dice: true },
            { characterName: 'Test', selectedAvatar: 'avatar.png', bonus: true, dice: false },
        ];

        invalidCases.forEach(({ characterName, selectedAvatar, bonus, dice }) => {
            component.characterName = characterName;
            component.selectedAvatar = selectedAvatar;
            component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = bonus;
            component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = dice;

            component.submitCharacter();
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });
    });
});

//     it('should initialize attributes correctly', () => {
//         expect(component.attributes[ATTRIBUTE_TYPES.VITALITY]).toBe(DEFAULT_ATTRIBUTE_VALUE);
//         expect(component.attributes[ATTRIBUTE_TYPES.SPEED]).toBe(DEFAULT_ATTRIBUTE_VALUE);
//         expect(component.attributes[ATTRIBUTE_TYPES.ATTACK]).toBe(DEFAULT_ATTRIBUTE_VALUE);
//         expect(component.attributes[ATTRIBUTE_TYPES.DEFENSE]).toBe(DEFAULT_ATTRIBUTE_VALUE);
//     });

//     it('should assign bonus and reset the other attribute', () => {
//         component.assignBonus(ATTRIBUTE_TYPES.VITALITY);
//         expect(component.attributes[ATTRIBUTE_TYPES.VITALITY]).toBe(BONUS_ATTRIBUTE_VALUE);
//         expect(component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY]).toBe(true);
//         expect(component.attributes[ATTRIBUTE_TYPES.SPEED]).toBe(DEFAULT_ATTRIBUTE_VALUE);
//         expect(component.bonusAssigned[ATTRIBUTE_TYPES.SPEED]).toBe(false);

//         component.assignBonus(ATTRIBUTE_TYPES.SPEED);
//         expect(component.attributes[ATTRIBUTE_TYPES.SPEED]).toBe(BONUS_ATTRIBUTE_VALUE);
//         expect(component.bonusAssigned[ATTRIBUTE_TYPES.SPEED]).toBe(true);
//         expect(component.attributes[ATTRIBUTE_TYPES.VITALITY]).toBe(DEFAULT_ATTRIBUTE_VALUE);
//         expect(component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY]).toBe(false);
//     });

//     it('should toggle dice assignment and deactivate the other attribute if already assigned', () => {
//         component.assignDice(ATTRIBUTE_TYPES.ATTACK, DICE_TYPES.D6);
//         expect(component.diceAssigned[ATTRIBUTE_TYPES.ATTACK]).toBe(true);
//         expect(component.diceAssigned[ATTRIBUTE_TYPES.DEFENSE]).toBe(false);

//         component.assignDice(ATTRIBUTE_TYPES.DEFENSE, DICE_TYPES.D6);
//         expect(component.diceAssigned[ATTRIBUTE_TYPES.DEFENSE]).toBe(true);
//         expect(component.diceAssigned[ATTRIBUTE_TYPES.ATTACK]).toBe(false);

//         component.assignDice(ATTRIBUTE_TYPES.ATTACK, DICE_TYPES.D4);
//         expect(component.diceAssigned[ATTRIBUTE_TYPES.ATTACK]).toBe(true);
//         expect(component.diceAssigned[ATTRIBUTE_TYPES.DEFENSE]).toBe(false);
//     });

//     it('should display a snackbar message if the form is incomplete', () => {
//         component.characterName = '';
//         component.selectedAvatar = '';
//         component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = false;
//         component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = false;
//         component.submitCharacter();
//         expect(snackBar.open).toHaveBeenCalledWith(ERROR_MESSAGES.MISSING_CHARACTER_DETAILS, 'Close', { duration: 3000 });
//     });

//     it('should navigate to waiting-view when form is submitted correctly', () => {
//         component.characterName = 'Test Character';
//         component.selectedAvatar = 'assets/avatars/avatar1.png';
//         component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = true;
//         component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = true;
//         component.submitCharacter();
//         expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.WAITING_VIEW]);
//     });

//     it('should close the dialog when closePopup is called', () => {
//         component.closePopup();
//         expect(mockDialogRef.close).toHaveBeenCalled();
//     });

//     it('should not navigate if characterName is missing', () => {
//         component.characterName = '';
//         component.selectedAvatar = 'assets/avatars/avatar1.png';
//         component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = true;
//         component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = true;

//         component.submitCharacter();

//         expect(mockRouter.navigate).not.toHaveBeenCalled();
//     });

//     it('should not navigate if selectedAvatar is missing', () => {
//         component.characterName = 'Test Character';
//         component.selectedAvatar = '';
//         component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = true;
//         component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = true;

//         component.submitCharacter();

//         expect(mockRouter.navigate).not.toHaveBeenCalled();
//     });

//     it('should not navigate if no bonuses are assigned', () => {
//         component.characterName = 'Test Character';
//         component.selectedAvatar = 'assets/avatars/avatar1.png';
//         component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = false;
//         component.bonusAssigned[ATTRIBUTE_TYPES.SPEED] = false;
//         component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = true;

//         component.submitCharacter();

//         expect(mockRouter.navigate).not.toHaveBeenCalled();
//     });

//     it('should not navigate if no dice are assigned', () => {
//         component.characterName = 'Test Character';
//         component.selectedAvatar = 'assets/avatars/avatar1.png';
//         component.bonusAssigned[ATTRIBUTE_TYPES.VITALITY] = true;
//         component.diceAssigned[ATTRIBUTE_TYPES.ATTACK] = false;
//         component.diceAssigned[ATTRIBUTE_TYPES.DEFENSE] = false;

//         component.submitCharacter();

//         expect(mockRouter.navigate).not.toHaveBeenCalled();
//     });

//     it('should correctly set selectedAttackDice based on dice type', () => {
//         component.assignDice(ATTRIBUTE_TYPES.ATTACK, DICE_TYPES.D4);
//         expect(component.selectedAttackDice).toBe(DICE_TYPES.D4);
//         expect(component.selectedDefenseDice).toBe(DICE_TYPES.D6);

//         component.assignDice(ATTRIBUTE_TYPES.ATTACK, DICE_TYPES.D6);
//         expect(component.selectedAttackDice).toBe(DICE_TYPES.D6);
//         expect(component.selectedDefenseDice).toBe(DICE_TYPES.D4);

//         component.assignDice(ATTRIBUTE_TYPES.DEFENSE, DICE_TYPES.D4);
//         expect(component.selectedDefenseDice).toBe(DICE_TYPES.D4);
//         expect(component.selectedAttackDice).toBe(DICE_TYPES.D6);

//         component.assignDice(ATTRIBUTE_TYPES.DEFENSE, DICE_TYPES.D6);
//         expect(component.selectedDefenseDice).toBe(DICE_TYPES.D6);
//         expect(component.selectedAttackDice).toBe(DICE_TYPES.D4);
//     });

// });
