import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ErrorMessages, GameSize, Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { PopUpComponent } from './pop-up.component';
import { GameMode } from '@common/enums';

describe('PopUpComponent', () => {
    let component: PopUpComponent;
    let fixture: ComponentFixture<PopUpComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGameModeService: jasmine.SpyObj<GameModeService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
    let mockGridService: jasmine.SpyObj<GridService>;

    beforeEach(async () => {
        mockGameModeService = jasmine.createSpyObj('gameModeService', [
            'setGameMode',
            'setGameSize',
            'getGameMode',
            'getGameSize',
            'resetModeAndSize',
        ]);
        mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
        mockGameService = jasmine.createSpyObj('GameService', ['createNewGame', 'updateCurrentGame', 'addGame']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showMessage']);
        mockGridService = jasmine.createSpyObj('GridService', ['getGridSize']);

        await TestBed.configureTestingModule({
            imports: [PopUpComponent],
            providers: [
                { provide: MatDialog, useValue: mockDialog },
                { provide: GameService, useValue: mockGameService },
                { provide: GameModeService, useValue: mockGameModeService },
                { provide: Router, useValue: mockRouter },
                { provide: SnackbarService, useValue: mockSnackbarService },
                { provide: GridService, useValue: mockGridService },
            ],
        }).compileComponents();

        mockGameModeService.setGameMode(GameMode.None);
        mockGameModeService.setGameSize(GameSize.None);

        fixture = TestBed.createComponent(PopUpComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('setGameSize', () => {
        it('should be created', () => {
            mockGameModeService.setGameSize.and.returnValue(true);
            component.setGameSize(GameSize.Medium);
            expect(mockGameModeService.setGameSize).toHaveBeenCalledWith(GameSize.Medium);
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });

        it('should show an error message if the size is invalid', () => {
            mockGameModeService.setGameSize.and.returnValue(false);
            component.setGameSize('invalid-size' as GameSize);
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.InvalidGameSize);
        });
    });

    describe('setGameType', () => {
        it('should set the game mode if valid', () => {
            component.setGameType(GameMode.Classic);
            expect(mockGameModeService.setGameMode).toHaveBeenCalledWith(GameMode.Classic);
        });

        it('should set CTF when CTF is selected', () => {
            component.setGameType(GameMode.CTF);
            expect(mockGameModeService.setGameMode).toHaveBeenCalledWith(GameMode.CTF);
        });

        it('should set the mode even if it is invalid', () => {
            component.setGameType('invalid-mode' as GameMode);
            expect(mockGameModeService.setGameMode).toHaveBeenCalledWith('invalid-mode' as GameMode);
        });
    });

    describe('confirm', () => {
        let mockGame: Game;
        const GRID_SIZE_MEDIUM = 10;
        beforeEach(() => {
            mockGame = { id: 'game' } as Game;
            mockGameModeService.getGameSize.and.returnValue('medium' as GameSize);
            mockGameModeService.getGameMode.and.returnValue(GameMode.Classic);
            mockGridService.getGridSize.and.returnValue(GRID_SIZE_MEDIUM);
            mockGameService.createNewGame.and.returnValue(mockGame);
        });

        it('should show an error message if size or mode is missing', () => {
            mockGameModeService.getGameSize.and.returnValue('' as GameSize);
            mockGameModeService.getGameMode.and.returnValue('' as GameMode);
            component.confirm();
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.MissingGameDetails);
            expect(mockGameService.createNewGame).not.toHaveBeenCalled();
        });

        it('should create a new game', () => {
            component.confirm();
            expect(mockGameService.createNewGame).toHaveBeenCalledWith(GameMode.Classic, GRID_SIZE_MEDIUM);
            expect(mockGameService.updateCurrentGame).toHaveBeenCalledWith(mockGame);
        });

        it('should navigate to edition view after confirming the game', () => {
            component.confirm();
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.EditionView]);
        });
    });

    describe('closePopup', () => {
        it('should reset settings', () => {
            mockGameModeService.resetModeAndSize.and.callFake(() => {
                mockGameModeService.getGameMode.and.returnValue('' as GameMode);
                mockGameModeService.getGameSize.and.returnValue('' as GameSize);
            });
            component.closePopup();
            expect(mockGameModeService.resetModeAndSize).toHaveBeenCalled();
            expect(mockGameModeService.getGameMode()).toBe('');
            expect(mockGameModeService.getGameSize()).toBe('');
        });

        it('should close the dialog', () => {
            component.closePopup();
            expect(mockDialog.closeAll).toHaveBeenCalled();
        });
    });
});
