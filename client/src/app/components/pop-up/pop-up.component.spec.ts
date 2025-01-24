import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameModeService } from '@app/services/game-mode.service';
import { GameService } from '@app/services/game.service';
import { PopUpComponent } from './pop-up.component';

fdescribe('PopUpComponent', () => {
    let component: PopUpComponent;
    let fixture: ComponentFixture<PopUpComponent>;

    let mockGameService: jasmine.SpyObj<GameService>;
    let mockGameModeService: jasmine.SpyObj<GameModeService>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('gameService', ['updateCurrentGame', 'addGame']);
        mockGameModeService = jasmine.createSpyObj('gameModeService', ['getGameMode', 'setGameMode', 'setGameSize', 'getGameSize']);
        await TestBed.configureTestingModule({
            imports: [PopUpComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: GameModeService, useValue: mockGameModeService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PopUpComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('gameModeService should set the game size', () => {
        component.setGameSize('medium');
        expect(mockGameModeService.setGameSize).toHaveBeenCalledWith('medium');
    });

    it('gameModeService should set the game type', () => {
        mockGameModeService.getGameMode.and.returnValue('Classic');
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
});
