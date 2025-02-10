// import { TestBed } from '@angular/core/testing';
// import { ImageType, Tile, TileType } from '@app/interfaces/tile';
// import { GridService } from './grid-service.service';

// describe('GridService', () => {
//     let service: GridService;

//     beforeEach(() => {
//         TestBed.configureTestingModule({});
//         service = TestBed.inject(GridService);
//     });

//     it('should be created', () => {
//         expect(service).toBeTruthy();
//     });

//     it('should create a grid with the given rows and columns', () => {
//         const grid = service.createGrid(3, 3);

//         expect(grid.length).toBe(3);
//         expect(grid[0].length).toBe(3);

//         expect(grid[0][0].id).toBe('tile-0-0');
//         expect(grid[0][0].imageSrc).toBe(ImageType.Default);
//         expect(grid[0][0].type).toBe(TileType.Default);
//         expect(grid[0][0].isOccupied).toBeFalse();
//         expect(grid[0][0].isOpen).toBeTrue();
//     });

//     it('should set and get the grid', () => {
//         const newGrid: Tile[][] = [
//             [
//                 { id: 'tile-0-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
//                 { id: 'tile-0-1', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
//             ],
//             [
//                 { id: 'tile-1-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
//                 { id: 'tile-1-1', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
//             ],
//         ];
//         service.setGrid(newGrid);
//         const grid = service.getGrid();

//         expect(grid).toBe(newGrid);
//     });

//     it('should return a specific tile', () => {
//         const grid = service.createGrid(3, 3);
//         service.setGrid(grid); // Ensure the grid is set

//         const tile = service.getTile(1, 1);

//         expect(tile).toBe(grid[1][1]);
//     });

//     it('should return undefined when grid is not set in getTile', () => {
//         const tile = service.getTile(1, 1);

//         expect(tile).toBeUndefined();
//     });

//     it('should update a tile with new values', () => {
//         const grid = service.createGrid(3, 3);
//         service.setGrid(grid);

//         const newTile: Partial<Tile> = {
//             imageSrc: ImageType.Default,
//             isOccupied: true,
//         };

//         service.updateTile(1, 1, newTile);
//         const updatedTile = grid[1][1];

//         expect(updatedTile.isOccupied).toBeTrue();
//         expect(updatedTile.imageSrc).toBe(ImageType.Default);
//     });

//     it('should not update a tile if grid is not set', () => {
//         const newTile: Partial<Tile> = {
//             isOccupied: true,
//         };

//         service.updateTile(1, 1, newTile);
//     });

//     it('should not update a tile if the specified tile does not exist', () => {
//         const newTile: Partial<Tile> = {
//             isOccupied: true,
//         };

//         service.setGrid([[{ id: 'tile-0-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true }]]);

//         service.updateTile(1, 1, newTile);

//         const grid = service.getGrid();

//         if (grid) {
//             expect(grid[0][0].isOccupied).toBeFalse();
//         } else {
//             fail('Grid is undefined');
//         }
//     });
// });
