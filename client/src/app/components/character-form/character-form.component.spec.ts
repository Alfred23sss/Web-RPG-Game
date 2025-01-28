import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { CharacterFormComponent } from './character-form.component';

describe('CharacterFormComponent', () => {
    let component: CharacterFormComponent;
    let fixture: ComponentFixture<CharacterFormComponent>;
    let mockDialogRef: MatDialogRef<CharacterFormComponent>;
    let mockRouter: any;

    beforeEach(async () => {
        mockDialogRef = {
            close: jasmine.createSpy('close'),
        } as any;

        mockRouter = {
            navigate: jasmine.createSpy('navigate'),
        };

        await TestBed.configureTestingModule({
            imports: [FormsModule, MatDialogModule, RouterModule.forRoot([]), CharacterFormComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: Router, useValue: mockRouter },
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
        expect(component.attributes.vitality).toBe(4);
        expect(component.attributes.speed).toBe(4);
        expect(component.attributes.attack).toBe(4);
        expect(component.attributes.defense).toBe(4);
    });

    it('should call assignBonus for vitality from attributesList', () => {
        spyOn(component, 'assignBonus');
        if (component.attributesList[0].assignBonus) {
            component.attributesList[0].assignBonus(); // Calls assignBonus for 'vitality'
        }
        expect(component.assignBonus).toHaveBeenCalledWith('vitality');
    });

    it('should call assignBonus for speed from attributesList', () => {
        spyOn(component, 'assignBonus');
        if (component.attributesList[1].assignBonus) {
            component.attributesList[1].assignBonus(); // Calls assignBonus for 'speed'
        }
        expect(component.assignBonus).toHaveBeenCalledWith('speed');
    });

    it('should call assignDice for attack from attributesList', () => {
        spyOn(component, 'assignDice');
        if (component.attributesList[2].assignDice) {
            component.attributesList[2].assignDice(); // Calls assignDice for 'attack'
        }
        expect(component.assignDice).toHaveBeenCalledWith('attack');
    });

    it('should call assignDice for defense from attributesList', () => {
        spyOn(component, 'assignDice');
        if (component.attributesList[3].assignDice) {
            component.attributesList[3].assignDice(); // Calls assignDice for 'defense'
        }
        expect(component.assignDice).toHaveBeenCalledWith('defense');
    });

    it('should reset the dice for the attribute if it is already assigned', () => {
        component.assignDice('attack');
        expect(component.diceAssigned.attack).toBe(true);
        component.assignDice('attack');
        expect(component.diceAssigned.attack).toBe(false);
    });

    it('should assign a bonus and reset the other attribute', () => {
        component.assignBonus('vitality');
        expect(component.attributes.vitality).toBe(6);
        expect(component.bonusAssigned.vitality).toBe(true);
        expect(component.attributes.speed).toBe(4);
        expect(component.bonusAssigned.speed).toBe(false);

        component.assignBonus('speed');
        expect(component.attributes.speed).toBe(6);
        expect(component.bonusAssigned.speed).toBe(true);
        expect(component.attributes.vitality).toBe(4);
        expect(component.bonusAssigned.vitality).toBe(false);
    });

    it('should toggle dice assignment and deactivate the other attribute if already assigned', () => {
        component.assignDice('attack');
        component.assignDice('defense');
        expect(component.diceAssigned.attack).toBe(false);
        expect(component.diceAssigned.defense).toBe(true);

        component.assignDice('attack');
        expect(component.diceAssigned.attack).toBe(true);
        expect(component.diceAssigned.defense).toBe(false);
    });

    it('should display an alert if the form is incomplete', () => {
        spyOn(window, 'alert');
        component.characterName = '';
        component.selectedAvatar = '';
        component.bonusAssigned.vitality = false;
        component.diceAssigned.attack = false;
        component.submitCharacter();
        expect(window.alert).toHaveBeenCalledWith(
            'Please ensure you have:\n- Assigned +2 to one attribute (Vitality or Speed).\n- Assigned a D6 to one attribute (Attack or Defense).\n- Entered a name and selected an avatar.',
        );
    });

    it('should navigate to waiting-view when form is submitted correctly', () => {
        component.characterName = 'Test Character';
        component.selectedAvatar = 'assets/avatars/avatar1.png';
        component.bonusAssigned.vitality = true;
        component.diceAssigned.attack = true;
        component.submitCharacter();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/waiting-view']);
    });

    it('should close the dialog when closePopup is called', () => {
        component.closePopup();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });
});
