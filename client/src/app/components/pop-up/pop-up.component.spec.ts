import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameService } from '@app/services/game/game.service';
import { ERROR_MESSAGES, GAME_MODES, SNACKBAR_CONFIG } from '@app/constants/global.constants';
import { PopUpComponent } from './pop-up.component';

describe('PopUpComponent', () => {
    let component: PopUpComponent;
    let fixture: ComponentFixture<PopUpComponent>;

    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGameModeService: jasmine.SpyObj<GameModeService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('gameService', ['updateCurrentGame', 'addGame']);
        mockGameModeService = jasmine.createSpyObj('gameModeService', ['getGameMode', 'setGameMode', 'setGameSize', 'getGameSize']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [PopUpComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: GameModeService, useValue: mockGameModeService },
                { provide: MatDialog, useValue: mockDialog },
                { provide: Router, useValue: mockRouter },
                { provide: MatSnackBar, useValue: mockSnackBar },
            ],
        }).compileComponents();

        mockGameModeService.setGameMode('');
        mockGameModeService.setGameSize('');

        fixture = TestBed.createComponent(PopUpComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('gameModeService should set the game size', () => {
        component.setGameSize('small');
        expect(mockGameModeService.setGameSize).toHaveBeenCalledWith('small');
    });

    it('gameModeService should set the game type', () => {
        component.setGameType('Classic');
        expect(mockGameModeService.setGameMode).toHaveBeenCalledWith('Classic');
    });

    it('should show a snackbar message and reset game mode when selecting CTF', () => {
        mockGameModeService.getGameMode.and.returnValue(GAME_MODES.CTF);

        component.setGameType(GAME_MODES.CTF);

        expect(mockSnackBar.open).toHaveBeenCalledWith(ERROR_MESSAGES.UNAVAILABLE_GAMEMODE, SNACKBAR_CONFIG.ACTION, {
            duration: SNACKBAR_CONFIG.DURATION,
        });
        expect(mockGameModeService.setGameMode).toHaveBeenCalledWith('');
    });

    const games = [
        { input: 'small', gameSize: '10' },
        { input: 'medium', gameSize: '15' },
        { input: 'large', gameSize: '20' },
    ];

    games.forEach(({ input, gameSize }) => {
        it(`confirm should create a new game with size ${gameSize} and bring to the edition page`, () => {
            mockGameModeService.getGameSize.and.returnValue(input);
            mockGameModeService.getGameMode.and.returnValue('Classic');
            component.confirm();

            expect(mockGameService.updateCurrentGame).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    size: gameSize,
                    mode: 'Classic',
                    isVisible: true,
                    description: jasmine.stringMatching(`A Classic game on a ${input} map.`),
                }),
            );

            expect(mockGameService.addGame).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    size: gameSize,
                    mode: 'Classic',
                }),
            );

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/edition']);
        });
    });

    [
        { size: '', mode: 'Classic' },
        { size: 'small', mode: '' },
    ].forEach(({ size, mode }) => {
        it('should alert if mode or size is not selected in popup', () => {
            spyOn(window, 'alert');
            mockGameModeService.getGameSize.and.returnValue(size);
            mockGameModeService.getGameMode.and.returnValue(mode);

            component.confirm();

            expect(window.alert).toHaveBeenCalledWith('Please select both game size and game type!');
            expect(mockGameService.updateCurrentGame).not.toHaveBeenCalled();
            expect(mockGameService.addGame).not.toHaveBeenCalled();
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });
    });

    it('closePopup should reset selections and close popup', () => {
        component.closePopup();
        expect(mockGameModeService.setGameMode).toHaveBeenCalledWith('');
        expect(mockGameModeService.setGameSize).toHaveBeenCalledWith('');
        expect(mockDialog.closeAll).toHaveBeenCalled();
    });
});
