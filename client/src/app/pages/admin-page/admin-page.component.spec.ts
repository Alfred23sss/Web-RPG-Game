import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { AdminPageComponent } from './admin-page.component';
import { ActivatedRoute } from '@angular/router';

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGridService: jasmine.SpyObj<GridService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;

    const mockGames: Game[] = [
        {
            id: '1',
            name: 'Game 1',
            isVisible: false,
            size: '15',
            mode: 'Singleplayer',
            lastModified: new Date(),
            previewImage: 'image1.jpg',
            description: 'Description 1',
            grid: [],
        },
        {
            id: '2',
            name: 'Game 2',
            isVisible: true,
            size: '20',
            mode: 'Multiplayer',
            lastModified: new Date(),
            previewImage: 'image2.jpg',
            description: 'Description 2',
            grid: [],
        },
    ];

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['fetchGames', 'deleteGame', 'getGameById', 'updateCurrentGame']);
        mockGridService = jasmine.createSpyObj('GridService', ['setGrid']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

        mockGameService.fetchGames.and.returnValue(of(mockGames));

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
        expect(component.games).toEqual(mockGames);
    });

    it('should open dialog with PopUpComponent when openDialog is called', () => {
        component.openDialog();
        expect(mockDialog.open).toHaveBeenCalledWith(PopUpComponent);
    });

    it('should call deleteGame on gameService and remove game from list if confirm is true', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        const deletedGame: Game = {
            id: '1',
            name: 'Game 1',
            isVisible: false,
            size: '15',
            mode: 'Singleplayer',
            lastModified: new Date(),
            previewImage: 'image1.jpg',
            description: 'Description 1',
            grid: [],
        };
        mockGameService.deleteGame.and.returnValue(of(deletedGame));

        component.deleteGame('1');

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1?');
        expect(mockGameService.deleteGame).toHaveBeenCalledWith('1');
        expect(component.games).toEqual([mockGames[1]]);
    });

    it('should not call deleteGame on gameService if confirm is false', () => {
        spyOn(window, 'confirm').and.returnValue(false);

        component.deleteGame('1');

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1?');
        expect(mockGameService.deleteGame).not.toHaveBeenCalled();
        expect(component.games).toEqual(mockGames);
    });

    it('should update current game when updateCurrentGame is called', () => {
        const game = mockGames[0];
        mockGameService.getGameById.and.returnValue(game);

        component.updateCurrentGame('1');

        expect(mockGameService.getGameById).toHaveBeenCalledWith('1');
        expect(mockGameService.updateCurrentGame).toHaveBeenCalledWith(game);
    });

    it('should toggle game visibility when toggleVisibility is called', () => {
        const game = mockGames[0];
        mockGameService.getGameById.and.returnValue(game);
        const event = { target: { checked: true } } as unknown as Event;

        component.toggleVisibility('1', event);

        expect(mockGameService.getGameById).toHaveBeenCalledWith('1');
        expect(game.isVisible).toBeTrue();
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
