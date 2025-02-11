import { TestBed } from '@angular/core/testing';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';
import { GridService } from './grid-service.service';

const SMALL_GRID_SIZE = 3;
const MEDIUM_GRID_SIZE = 5;
const LARGE_GRID_SIZE = 7;

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
        const newGrid: Tile[][] = [
            [
                { id: 'tile-0-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
                { id: 'tile-0-1', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
            ],
            [
                { id: 'tile-1-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
                { id: 'tile-1-1', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
            ],
        ];
        service.setGrid(newGrid);
        const grid = service.getGrid();

        expect(grid).toBe(newGrid);
    });

    it('should return a specific tile', () => {
        const grid = service.createGrid(SMALL_GRID_SIZE, SMALL_GRID_SIZE);
        service.setGrid(grid);

        const tile = service.getTile(1, 1);

        expect(tile).toBe(grid[1][1]);
    });

    it('should return undefined when grid is not set in getTile', () => {
        const tile = service.getTile(1, 1);

        expect(tile).toBeUndefined();
    });

    it('should return the correct grid size for valid game sizes', () => {
        expect(service.getGridSize('small')).toBe(SMALL_GRID_SIZE);
        expect(service.getGridSize('medium')).toBe(MEDIUM_GRID_SIZE);
        expect(service.getGridSize('large')).toBe(LARGE_GRID_SIZE);
    });

    it('should return the default grid size when given an invalid game size', () => {
        expect(service.getGridSize('invalid-size')).toBe(SMALL_GRID_SIZE);
        expect(service.getGridSize('')).toBe(SMALL_GRID_SIZE);
        expect(service.getGridSize(null as unknown as string)).toBe(SMALL_GRID_SIZE);
        expect(service.getGridSize(undefined as unknown as string)).toBe(SMALL_GRID_SIZE);
    });
});
