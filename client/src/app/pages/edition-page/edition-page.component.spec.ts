/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { GridComponent } from '@app/components/grid/grid.component';
import { ItemBarComponent } from '@app/components/item-bar/item-bar.component';
import { ToolbarComponent } from '@app/components/toolbar/toolbar.component';
import { ImageType, TileType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Tile } from '@app/interfaces/tile';
import { GameValidationService } from '@app/services/game-validation/game-validation.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { ToolService } from '@app/services/tool/tool.service';
import { of } from 'rxjs';
import { EditionPageComponent } from './edition-page.component';

function createBaseGrid(size: number): Tile[][] {
    return Array.from({ length: size }, (_, rowIndex) =>
        Array.from({ length: size }, (i, colIndex) => ({
            id: `${rowIndex}-${colIndex}`,
            imageSrc: './assets/tile-items/default.png',
            isOccupied: false,
            type: TileType.Default,
            isOpen: true,
        })),
    );
}

describe('EditionPageComponent', () => {
    let component: EditionPageComponent;
    let fixture: ComponentFixture<EditionPageComponent>;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let gridServiceMock: jasmine.SpyObj<GridService>;
    let gameValidationServiceMock: jasmine.SpyObj<GameValidationService>;
    let snackbarServiceMock: jasmine.SpyObj<SnackbarService>;
    let routerMock: jasmine.SpyObj<Router>;

    const baseGridSize = 3;
    const mockDate = new Date('2025-02-11T16:48:33.205Z');
    const defaultMockGame: Game = {
        id: '1',
        name: 'Test Game',
        size: 'medium',
        mode: 'Classic',
        lastModified: mockDate,
        isVisible: true,
        previewImage: '',
        description: 'Test Description',
        grid: createBaseGrid(baseGridSize),
    };

    beforeEach(async () => {
        gameServiceMock = jasmine.createSpyObj('GameService', ['fetchGames', 'getCurrentGame', 'updateCurrentGame', 'saveGame', 'savePreviewImage']);
        gridServiceMock = jasmine.createSpyObj('GridService', ['setGrid']);
        gameValidationServiceMock = jasmine.createSpyObj('GameValidationService', ['validateGame']);
        snackbarServiceMock = jasmine.createSpyObj('SnackbarService', ['showConfirmation']);
        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        const toolServiceMock = jasmine.createSpyObj('ToolService', ['setSelectedTool', 'getSelectedTool'], {
            selectedTool$: of({ tool: TileType.Default, image: ImageType.Default }),
        });

        routerMock.navigate.and.returnValue(Promise.resolve(true));
        gameServiceMock.fetchGames.and.returnValue(of([]));
        snackbarServiceMock.showConfirmation.and.returnValue(of(true));
        gameServiceMock.getCurrentGame.and.returnValue(defaultMockGame);

        await TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, GridComponent, ToolbarComponent, ItemBarComponent, RouterModule.forRoot([])],
            providers: [
                { provide: GameService, useValue: gameServiceMock },
                { provide: GridService, useValue: gridServiceMock },
                { provide: GameValidationService, useValue: gameValidationServiceMock },
                { provide: SnackbarService, useValue: snackbarServiceMock },
                { provide: Router, useValue: routerMock },
                { provide: ToolService, useValue: toolServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should fetch games on init', () => {
        gameServiceMock.fetchGames.and.returnValue(of([]));
        component.ngOnInit();
        expect(gameServiceMock.fetchGames).toHaveBeenCalled();
    });

    it('should clone the initial game on init', () => {
        const anotherMockDate = new Date('2025-02-11T16:48:33.205Z');
        const mockGame: Game = {
            id: '2',
            name: 'Another Test Game',
            size: 'medium',
            mode: 'Classic',
            lastModified: anotherMockDate,
            isVisible: true,
            previewImage: '',
            description: 'Another Test Description',
            grid: createBaseGrid(baseGridSize),
        };
        gameServiceMock.getCurrentGame.and.returnValue(mockGame);
        component.ngOnInit();
        expect(component.game.id).toEqual(mockGame.id);
        expect(component.game.name).toEqual(mockGame.name);
        expect(component.game.size).toEqual(mockGame.size);
        expect(component.game.mode).toEqual(mockGame.mode);
        expect(new Date(component.game.lastModified).toISOString()).toEqual(mockGame.lastModified.toISOString());
        expect(component.game.isVisible).toEqual(mockGame.isVisible);
        expect(component.game.previewImage).toEqual(mockGame.previewImage);
        expect(component.game.description).toEqual(mockGame.description);
        expect(component.game.grid).toEqual(mockGame.grid);
        expect(component['originalGame'].id).toEqual(mockGame.id);
        expect(gridServiceMock.setGrid).toHaveBeenCalledWith(mockGame.grid);
    });

    it('should navigate back to admin if confirmed', () => {
        snackbarServiceMock.showConfirmation.and.returnValue(of(true));
        component.backToAdmin();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should reset the game state', () => {
        const resetMockDate = new Date('2025-02-11T16:48:33.205Z');
        const mockGame: Game = {
            id: '1',
            name: 'Test Game',
            size: 'medium',
            mode: 'Classic',
            lastModified: resetMockDate,
            isVisible: true,
            previewImage: '',
            description: 'Test Description',
            grid: createBaseGrid(baseGridSize),
        };
        component['originalGame'] = mockGame;
        component.originalItemBar = JSON.stringify([]);
        component.reset();
        expect(component.game.id).toEqual(mockGame.id);
        expect(component.game.name).toEqual(mockGame.name);
        expect(component.game.size).toEqual(mockGame.size);
        expect(component.game.mode).toEqual(mockGame.mode);
        expect(component.game.isVisible).toEqual(mockGame.isVisible);
        expect(component.game.previewImage).toEqual(mockGame.previewImage);
        expect(component.game.description).toEqual(mockGame.description);
        expect(component.game.grid).toEqual(mockGame.grid);
    });

    it('should save the game if valid', async () => {
        const saveMockDate = new Date('2025-02-11T16:48:33.205Z');
        component.game = {
            id: '4',
            name: 'Save Test Game',
            size: 'medium',
            mode: 'Classic',
            lastModified: saveMockDate,
            isVisible: true,
            previewImage: '',
            description: 'Save Test Description',
            grid: createBaseGrid(baseGridSize),
        };
        component.gameName = 'Updated Game';
        component.gameDescription = 'Updated Description';
        gameValidationServiceMock.validateGame.and.returnValue(true);
        gameServiceMock.savePreviewImage.and.returnValue(Promise.resolve('preview-url'));

        await component.save();

        expect(component.game.name).toBe('Updated Game');
        expect(component.game.description).toBe('Updated Description');
        expect(gameServiceMock.updateCurrentGame).toHaveBeenCalled();
        expect(gameServiceMock.saveGame).toHaveBeenCalled();
    });

    it('should not save the game if invalid', async () => {
        gameValidationServiceMock.validateGame.and.returnValue(false);
        await component.save();
        expect(gameServiceMock.updateCurrentGame).not.toHaveBeenCalled();
    });

    it('should handle error when savePreviewImage fails', async () => {
        gameServiceMock.savePreviewImage.and.returnValue(Promise.reject('Error saving preview image'));
        gameValidationServiceMock.validateGame.and.returnValue(true);
        await component.save();
        expect(component.isSaving).toBeFalse();
    });

    it('should return early if already saving', async () => {
        component.isSaving = true;
        await component.save();

        expect(gameServiceMock.savePreviewImage).not.toHaveBeenCalled();
        expect(gameServiceMock.updateCurrentGame).not.toHaveBeenCalled();
        expect(gameServiceMock.saveGame).not.toHaveBeenCalled();
    });
});
