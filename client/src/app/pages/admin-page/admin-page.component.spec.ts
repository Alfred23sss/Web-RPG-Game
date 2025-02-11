import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';
import { MOCK_GAMES, ROUTES } from '@app/constants/global.constants';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { of, throwError } from 'rxjs';
import { AdminPageComponent } from './admin-page.component';

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGridService: jasmine.SpyObj<GridService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', [
            'fetchGames',
            'deleteGame',
            'getGameById',
            'updateCurrentGame',
            'updateGameVisibility',
        ]);
        mockGameService.fetchGames.and.returnValue(of(MOCK_GAMES));
        mockGameService.deleteGame.and.returnValue(of(MOCK_GAMES[1]));
        mockGameService.getGameById.and.returnValue(MOCK_GAMES[0]);
        mockGameService.updateGameVisibility.and.callFake((id: string, isVisible: boolean) => {
            const game = MOCK_GAMES.find((g) => g.id === id);
            if (game) game.isVisible = isVisible;
        });

        mockGridService = jasmine.createSpyObj('GridService', ['setGrid']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
        mockSnackbarService = jasmine.createSpyObj('SnackBarService', ['showConfirmation', 'showMessage']);
        mockSnackbarService.showConfirmation.and.returnValue(of(true));

        const mockActivatedRoute = { snapshot: { params: { id: '1' } } };

        await TestBed.configureTestingModule({
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: GridService, useValue: mockGridService },
                { provide: MatDialog, useValue: mockDialog },
                { provide: SnackbarService, useValue: mockSnackbarService },
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
            ],
        }).compileComponents();

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
        mockSnackbarService.showConfirmation.and.returnValue(of(true));

        const updatedGames = MOCK_GAMES.filter((game) => game.id !== '1');
        mockGameService.fetchGames.and.returnValue(of(updatedGames));

        component.deleteGame('1');
        fixture.detectChanges();

        expect(mockSnackbarService.showConfirmation).toHaveBeenCalledWith('Are you sure you want to delete this game?');

        expect(mockGameService.deleteGame).toHaveBeenCalledWith('1');

        expect(component.games).toEqual(updatedGames);
    });

    it('should not call deleteGame on gameService if confirm is false', () => {
        mockSnackbarService.showConfirmation.and.returnValue(of(false));

        component.deleteGame('1');
        fixture.detectChanges();

        expect(mockSnackbarService.showConfirmation).toHaveBeenCalledWith('Are you sure you want to delete this game?');
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
        const mockGame = { ...MOCK_GAMES[0] };

        mockGameService.getGameById.and.callFake(() => mockGame);

        mockGameService.updateGameVisibility.and.callFake((id: string, isVisible: boolean) => {
            const game = mockGameService.getGameById(id);
            if (game) {
                game.isVisible = isVisible;
            }
        });

        expect(mockGame.isVisible).toBeFalse();

        const event = { target: { checked: true } } as unknown as Event;
        component.toggleVisibility('1', event);

        expect(mockGameService.updateGameVisibility).toHaveBeenCalledWith('1', true);
        expect(mockGame.isVisible).toBeTrue();

        const event2 = { target: { checked: false } } as unknown as Event;
        component.toggleVisibility('1', event2);

        expect(mockGameService.updateGameVisibility).toHaveBeenCalledWith('1', false);
        expect(mockGame.isVisible).toBeFalse();
    });

    it('should call fetchGames and update games array after successful deletion', () => {
        mockSnackbarService.showConfirmation.and.returnValue(of(true));

        const updatedGames = MOCK_GAMES.filter((game) => game.id !== '1');
        mockGameService.fetchGames.and.returnValue(of(updatedGames));

        component.deleteGame('1');
        fixture.detectChanges();

        expect(mockSnackbarService.showConfirmation).toHaveBeenCalledWith('Are you sure you want to delete this game?');

        expect(mockGameService.deleteGame).toHaveBeenCalledWith('1');

        expect(mockGameService.fetchGames).toHaveBeenCalled();

        expect(component.games).toEqual(updatedGames);
    });

    it('should call showMessage with "Deletion failed" when deleteGame fails', () => {
        mockSnackbarService.showConfirmation.and.returnValue(of(true));

        mockGameService.deleteGame.and.returnValue(throwError(() => new Error('Deletion failed')));

        component.deleteGame('1');
        fixture.detectChanges();

        expect(mockSnackbarService.showConfirmation).toHaveBeenCalledWith('Are you sure you want to delete this game?');

        expect(mockGameService.deleteGame).toHaveBeenCalledWith('1');

        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('Deletion failed');
    });

    it('should navigate to the home page when navigateToHome is called', () => {
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate');

        component.navigateToHome();

        expect(navigateSpy).toHaveBeenCalledWith([ROUTES.homePage]);
    });

    it('should show an error message when loading games fails', () => {
        mockGameService.fetchGames.and.returnValue(throwError(() => new Error('Failed to load games')));

        component.ngOnInit();
        fixture.detectChanges();

        expect(mockGameService.fetchGames).toHaveBeenCalled();

        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('Failed to load games');
    });
});
