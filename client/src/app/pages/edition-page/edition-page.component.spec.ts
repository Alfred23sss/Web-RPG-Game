import { ComponentFixture, TestBed } from '@angular/core/testing';
import { mockGame } from '@app/global.constants';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { of } from 'rxjs';
import { EditionPageComponent } from './edition-page.component';

describe('EditionPageComponent', () => {
    let component: EditionPageComponent;
    let fixture: ComponentFixture<EditionPageComponent>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let gridServiceSpy: jasmine.SpyObj<GridService>;

    beforeEach(async () => {
        gameServiceSpy = jasmine.createSpyObj('GameService', ['fetchGames', 'getCurrentGame', 'updateCurrentGame', 'saveGame']);
        gridServiceSpy = jasmine.createSpyObj('GridService', ['setGrid']);

        gameServiceSpy.fetchGames.and.returnValue(of([]));
        gameServiceSpy.getCurrentGame.and.returnValue(mockGame);

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
                id: mockGame.id,
                name: mockGame.name,
                size: mockGame.size,
                description: mockGame.description,
                grid: mockGame.grid,
                isVisible: mockGame.isVisible,
                mode: mockGame.mode,
                previewImage: mockGame.previewImage,
                lastModified: new Date(mockGame.lastModified).toISOString(),
            }),
        );
        expect(component.tempGame).toEqual(
            jasmine.objectContaining({
                id: mockGame.id,
                name: mockGame.name,
                size: mockGame.size,
                description: mockGame.description,
                grid: mockGame.grid,
                isVisible: mockGame.isVisible,
                mode: mockGame.mode,
                previewImage: mockGame.previewImage,
                lastModified: new Date(mockGame.lastModified).toISOString(),
            }),
        );
        expect(component.gameName).toBe(mockGame.name);
        expect(component.gameDescription).toBe(mockGame.description);
        expect(gridServiceSpy.setGrid).toHaveBeenCalledWith(mockGame.grid);
        expect(new Date(component.tempGame.lastModified).getTime()).toBeCloseTo(mockGame.lastModified.getTime(), -2);
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
