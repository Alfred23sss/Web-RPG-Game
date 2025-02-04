import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';
import { MOCK_GAMES } from '@app/global.constants';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { of, throwError } from 'rxjs';
import { AdminPageComponent } from './admin-page.component';

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGridService: jasmine.SpyObj<GridService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['fetchGames', 'deleteGame', 'getGameById', 'updateCurrentGame']);
        mockGridService = jasmine.createSpyObj('GridService', ['setGrid']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

        mockGameService.fetchGames.and.returnValue(of(MOCK_GAMES));

        await TestBed.configureTestingModule({
            imports: [AdminPageComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: GridService, useValue: mockGridService },
                { provide: MatDialog, useValue: mockDialog },
                { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
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

    it('should fetch games on ngOnInit', () => {
        expect(mockGameService.fetchGames).toHaveBeenCalled();
        expect(component.games).toEqual(MOCK_GAMES);
    });

    it('should open dialog with PopUpComponent when openDialog is called', () => {
        component.openDialog();
        expect(mockDialog.open).toHaveBeenCalledWith(PopUpComponent);
    });

    it('should call deleteGame on gameService and remove game from list if confirm is true', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        mockGameService.deleteGame.and.returnValue(of(MOCK_GAMES[1]));

        component.deleteGame('1');

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1?');
        expect(mockGameService.deleteGame).toHaveBeenCalledWith('1');
        expect(component.games).toEqual([MOCK_GAMES[1]]);
    });

    it('should not call deleteGame on gameService if confirm is false', () => {
        spyOn(window, 'confirm').and.returnValue(false);

        component.deleteGame('1');

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1?');
        expect(mockGameService.deleteGame).not.toHaveBeenCalled();
        expect(component.games).toEqual(MOCK_GAMES);
    });

    it('should update current game when updateCurrentGame is called', () => {
        const game = MOCK_GAMES[0];
        mockGameService.getGameById.and.returnValue(game);

        component.updateCurrentGame('1');

        expect(mockGameService.getGameById).toHaveBeenCalledWith('1');
        expect(mockGameService.updateCurrentGame).toHaveBeenCalledWith(game);
    });

    it('should toggle game visibility when toggleVisibility is called', () => {
        mockGameService.getGameById.and.returnValue(MOCK_GAMES[0]);
        const event = { target: { checked: true } } as unknown as Event;

        component.toggleVisibility('1', event);

        expect(mockGameService.getGameById).toHaveBeenCalledWith('1');
        expect(MOCK_GAMES[0].isVisible).toBeTrue();
    });

    it('should log an error alert when deleteGame fails', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        spyOn(window, 'alert');
        const errorResponse = new Error('Deletion failed');
        mockGameService.deleteGame.and.returnValue(throwError(() => errorResponse));

        component.deleteGame('1');

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1?');
        expect(mockGameService.deleteGame).toHaveBeenCalledWith('1');
        expect(window.alert).toHaveBeenCalledWith('Deletion failed.');
    });
});
