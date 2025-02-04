import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { of } from 'rxjs';
import { EditionPageComponent } from './edition-page.component';
import { MOCK_GAMES } from '@app/global.constants';

describe('EditionPageComponent', () => {
    let component: EditionPageComponent;
    let fixture: ComponentFixture<EditionPageComponent>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let gridServiceSpy: jasmine.SpyObj<GridService>;

    beforeEach(async () => {
        gameServiceSpy = jasmine.createSpyObj('GameService', ['fetchGames', 'getCurrentGame', 'updateCurrentGame', 'saveGame']);
        gridServiceSpy = jasmine.createSpyObj('GridService', ['setGrid']);

        gameServiceSpy.fetchGames.and.returnValue(of([]));
        gameServiceSpy.getCurrentGame.and.returnValue(MOCK_GAMES[0]);

        await TestBed.configureTestingModule({
            imports: [EditionPageComponent],
            providers: [
                { provide: GameService, useValue: gameServiceSpy },
                { provide: GridService, useValue: gridServiceSpy },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(EditionPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with a game if available', () => {
        expect(component.tempGame).toEqual(
            jasmine.objectContaining({
                id: MOCK_GAMES[0].id,
                name: MOCK_GAMES[0].name,
                size: MOCK_GAMES[0].size,
                description: MOCK_GAMES[0].description,
                grid: MOCK_GAMES[0].grid,
                isVisible: MOCK_GAMES[0].isVisible,
                mode: MOCK_GAMES[0].mode,
                previewImage: MOCK_GAMES[0].previewImage,
                lastModified: new Date(MOCK_GAMES[0].lastModified).toISOString(),
            }),
        );
        expect(component.tempGame).toEqual(
            jasmine.objectContaining({
                id: MOCK_GAMES[0].id,
                name: MOCK_GAMES[0].name,
                size: MOCK_GAMES[0].size,
                description: MOCK_GAMES[0].description,
                grid: MOCK_GAMES[0].grid,
                isVisible: MOCK_GAMES[0].isVisible,
                mode: MOCK_GAMES[0].mode,
                previewImage: MOCK_GAMES[0].previewImage,
                lastModified: new Date(MOCK_GAMES[0].lastModified).toISOString(),
            }),
        );
        expect(component.gameName).toBe(MOCK_GAMES[0].name);
        expect(component.gameDescription).toBe(MOCK_GAMES[0].description);
        expect(gridServiceSpy.setGrid).toHaveBeenCalledWith(MOCK_GAMES[0].grid);
        expect(new Date(component.tempGame.lastModified).getTime()).toEqual(MOCK_GAMES[0].lastModified.getTime());
    });

    it('should call GameService to save the updated game', () => {
        component.gameName = 'Updated Name';
        component.gameDescription = 'Updated Description';

        component.save();

        expect(component.tempGame.name).toBe('Updated Name');
        expect(component.tempGame.description).toBe('Updated Description');
        expect(gameServiceSpy.updateCurrentGame).toHaveBeenCalledWith(component.tempGame);
        expect(gameServiceSpy.saveGame).toHaveBeenCalledWith(component.tempGame);
    });

    it('should reset the game to its original state', () => {
        component.gameName = 'Modified Name';
        component.gameDescription = 'Modified Description';

        component.reset();

        expect(gameServiceSpy.updateCurrentGame).toHaveBeenCalledWith(component.originalGame);
    });
});
