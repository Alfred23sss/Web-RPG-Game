import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { of } from 'rxjs';
// import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { MOCK_GAMES } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game/game.service';
import { CreatePageComponent } from './create-page.component';

describe('CreatePageComponent', () => {
    let component: CreatePageComponent;
    let fixture: ComponentFixture<CreatePageComponent>;
    // let dialog: MatDialog;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['fetchGames']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [MatDialogModule, MatTooltipModule, CommonModule, CreatePageComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CreatePageComponent);
        component = fixture.componentInstance;
        // dialog = TestBed.inject(MatDialog);

        mockGameService.fetchGames.and.returnValue(of(MOCK_GAMES));
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with games from service', () => {
        expect(component.games).toEqual(MOCK_GAMES);
    });

    it('should filter visible games correctly', () => {
        const visibleGames = component.visibleGames;
        expect(visibleGames.length).toBe(1);
        expect(visibleGames.every((game) => game.isVisible)).toBeTrue();
    });

    it('should call fetchGames on ngOnInit', () => {
        component.ngOnInit();
        expect(mockGameService.fetchGames).toHaveBeenCalled();
    });

    // it('should open character form dialog with correct data', () => {
    //     const dialogSpy = spyOn(dialog, 'open');
    //     const testGame = MOCK_GAMES[0];

    //     component.openDialog(testGame);

    //     expect(dialogSpy).toHaveBeenCalledWith(CharacterFormComponent, {
    //         data: { game: testGame },
    //     });
    // });

    it('should navigate to home page', () => {
        component.navigateToHome();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should return empty array when no games are visible', () => {
        component.games = undefined as unknown as Game[];
        expect(component.visibleGames).toEqual([]);
    });
});
