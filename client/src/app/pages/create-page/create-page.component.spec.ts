import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreatePageComponent } from './create-page.component';
import { MatDialog } from '@angular/material/dialog';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';

describe('CreatePageComponent', () => {
    let component: CreatePageComponent;
    let fixture: ComponentFixture<CreatePageComponent>;
    let mockDialog: jasmine.SpyObj<MatDialog>;

    beforeEach(async () => {
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
        await TestBed.configureTestingModule({
            imports: [CreatePageComponent],
            providers: [{ provide: MatDialog, useValue: mockDialog }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CreatePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('openDialog should open the dialog with PopUpComponent', () => {
        component.openDialog();
        expect(mockDialog.open).toHaveBeenCalledWith(CharacterFormComponent);
    });
});
