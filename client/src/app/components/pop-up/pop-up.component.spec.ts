import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameService } from '@app/services/game/game.service';
import { PopUpComponent } from './pop-up.component';

describe('PopUpComponent', () => {
    let component: PopUpComponent;
    let fixture: ComponentFixture<PopUpComponent>;

    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGameModeService: jasmine.SpyObj<GameModeService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('gameService', ['updateCurrentGame', 'addGame']);
        mockGameModeService = jasmine.createSpyObj('gameModeService', ['getGameMode', 'setGameMode', 'setGameSize', 'getGameSize']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [PopUpComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: GameModeService, useValue: mockGameModeService },
                { provide: MatDialog, useValue: mockDialog },
                { provide: Router, useValue: mockRouter },
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

    it('should alert if CTF mode is selected and reset the mode', () => {
        spyOn(window, 'alert');
        mockGameModeService.getGameMode.and.returnValue('CTF');
        component.setGameType('CTF');
        expect(window.alert).toHaveBeenCalledWith('CTF gamemode is currently unavailable!');
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

    it('confirmPopup should reset selections and close popup', () => {
        component.confirmPopup();
        expect(mockGameModeService.setGameMode).toHaveBeenCalledWith('');
        expect(mockGameModeService.setGameSize).toHaveBeenCalledWith('');
        expect(mockDialog.closeAll).toHaveBeenCalled();
    });
});
