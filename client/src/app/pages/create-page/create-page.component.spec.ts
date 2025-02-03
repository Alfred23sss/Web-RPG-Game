import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { GameService } from '@app/services/game/game.service';
import { CreatePageComponent } from './create-page.component';

describe('CreatePageComponent', () => {
    let component: CreatePageComponent;
    let fixture: ComponentFixture<CreatePageComponent>;
    let dialog: MatDialog;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MatDialogModule, MatTooltipModule, CommonModule, CreatePageComponent],
            providers: [
                { provide: GameService, useValue: {} }, // Mock GameService if needed
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CreatePageComponent);
        component = fixture.componentInstance;
        dialog = TestBed.inject(MatDialog);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should open dialog with CharacterFormComponent when openDialog is called', () => {
        const dialogOpenSpy = spyOn(dialog, 'open').and.callThrough();

        component.openDialog();

        expect(dialogOpenSpy).toHaveBeenCalledWith(CharacterFormComponent);
    });
});
