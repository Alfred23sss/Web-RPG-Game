import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game.service';
import { AdminPageComponent } from './admin-page.component';

fdescribe('AdminPageComponent', () => {
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['removeGame', 'getGames', 'getGameByName']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
        await TestBed.configureTestingModule({
            imports: [AdminPageComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: MatDialog, useValue: mockDialog },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call removeGame on gameService if confirm dialog is accepted', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        const gameName = 'Test Game';

        component.deleteGame(gameName);

        expect(window.confirm).toHaveBeenCalledWith(`Confirm deleting ${gameName}?`);
        expect(mockGameService.removeGame).toHaveBeenCalledWith(gameName);
    });

    it('should not call removeGame on gameService if confirm dialog is canceled', () => {
        spyOn(window, 'confirm').and.returnValue(false);
        const gameName = 'Test Game';

        component.deleteGame(gameName);

        expect(window.confirm).toHaveBeenCalledWith(`Confirm deleting ${gameName}?`);
        expect(mockGameService.removeGame).not.toHaveBeenCalled();
    });

    const testGame: Game = {
        name: 'Test Game',
        isVisible: false,
        size: '15x15',
        mode: 'Singleplayer',
        lastModified: new Date(),
        previewImage: 'image.jpg',
        description: 'Description Test',
        grid: [],
    };

    it('checkbox should update game visibility to true when checked', () => {
        mockGameService.getGameByName.and.returnValue(testGame);

        const event = { target: { checked: true } } as unknown as InputEvent;
        component.toggleVisibility(testGame.name, event);

        expect(testGame.isVisible).toBeTrue();
    });

    it('checkbox should update game visibility to false unchecked', () => {
        mockGameService.getGameByName.and.returnValue(testGame);

        const event = { target: { checked: false } } as unknown as InputEvent;
        component.toggleVisibility(testGame.name, event);

        expect(testGame.isVisible).toBeFalse();
    });

    it('openDialog should open the dialog with PopUpComponent', () => {
        component.openDialog();
        expect(mockDialog.open).toHaveBeenCalledWith(PopUpComponent);
    });
});
