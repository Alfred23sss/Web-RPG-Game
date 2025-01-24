import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameModeService } from '@app/services/game-mode.service';
import { GameService } from '@app/services/game.service';
import { PopUpComponent } from './pop-up.component';

describe('PopUpComponent', () => {
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

    it('should set the game ');
});
