import { TestBed } from '@angular/core/testing';
import { GameSize, TileType } from '@app/enums/global.enums';
import { GridService } from './grid-service.service';
import { MOCK_GRID } from '@app/constants/global.constants';
import { ImageType } from '@common/enums';

const SMALL_GRID_SIZE = 10;
const MEDIUM_GRID_SIZE = 15;
const LARGE_GRID_SIZE = 20;

describe('GridService', () => {
    let service: GridService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GridService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should create a grid with the given rows and columns', () => {
        const grid = service.createGrid(SMALL_GRID_SIZE, SMALL_GRID_SIZE);

        expect(grid.length).toBe(SMALL_GRID_SIZE);
        expect(grid[0].length).toBe(SMALL_GRID_SIZE);

        expect(grid[0][0].id).toBe('tile-0-0');
        expect(grid[0][0].imageSrc).toBe(ImageType.Default);
        expect(grid[0][0].type).toBe(TileType.Default);
        expect(grid[0][0].isOccupied).toBeFalse();
        expect(grid[0][0].isOpen).toBeTrue();
    });

    it('should set and get the grid', () => {
        service.setGrid(MOCK_GRID);
        const grid = service.getGrid();

        expect(grid).toBe(MOCK_GRID);
    });

    it('should return the correct grid size for valid game sizes', () => {
        expect(service.getGridSize(GameSize.Small)).toBe(SMALL_GRID_SIZE);
        expect(service.getGridSize(GameSize.Medium)).toBe(MEDIUM_GRID_SIZE);
        expect(service.getGridSize(GameSize.Large)).toBe(LARGE_GRID_SIZE);
    });

    it('should return the default grid size when given an invalid game size', () => {
        expect(service.getGridSize('invalid-size' as GameSize)).toBe(SMALL_GRID_SIZE);
        expect(service.getGridSize('' as GameSize)).toBe(SMALL_GRID_SIZE);
        expect(service.getGridSize(null as unknown as GameSize)).toBe(SMALL_GRID_SIZE);
        expect(service.getGridSize(undefined as unknown as GameSize)).toBe(SMALL_GRID_SIZE);
    });
});
