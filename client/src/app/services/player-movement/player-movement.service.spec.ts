import { TestBed } from '@angular/core/testing';
import { ImageType, TileType } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';
import { GridService } from '@app/services/grid/grid-service.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';

const SMALL_MOVEMENT = 3;
const LARGE_MOVEMENT = 5;

describe('PlayerMovementService', () => {
    let service: PlayerMovementService;
    let mockGridService: jasmine.SpyObj<GridService>;

    beforeEach(() => {
        mockGridService = jasmine.createSpyObj('GridService', ['getGrid']);

        TestBed.configureTestingModule({
            providers: [{ provide: GridService, useValue: mockGridService }],
        });

        service = TestBed.inject(PlayerMovementService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('availablePath', () => {
        it('should return undefined if startTile is undefined', () => {
            expect(service.availablePath(undefined, SMALL_MOVEMENT)).toBeUndefined();
        });

        it('should return undefined if grid is undefined', () => {
            mockGridService.getGrid.and.returnValue(undefined);
            expect(
                service.availablePath(
                    { id: 'tile-0-0', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false },
                    SMALL_MOVEMENT,
                ),
            ).toBeUndefined();
        });

        it('should return only the startTile if maxMovement is 0', () => {
            const grid: Tile[][] = [[{ id: 'tile-0-0', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false }]];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 0);
            expect(result).toEqual([grid[0][0]]);
        });

        it('should correctly compute reachable tiles', () => {
            const grid: Tile[][] = [
                [
                    { id: 'tile-0-0', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false },
                    { id: 'tile-0-1', type: TileType.Water, imageSrc: ImageType.Water, isOpen: true, isOccupied: false },
                    { id: 'tile-0-2', type: TileType.Default, imageSrc: ImageType.Water, isOpen: true, isOccupied: false },
                ],
                [
                    { id: 'tile-1-0', type: TileType.Wall, imageSrc: ImageType.Wall, isOpen: true, isOccupied: false },
                    { id: 'tile-1-1', type: TileType.Door, imageSrc: ImageType.ClosedDoor, isOpen: false, isOccupied: false },
                    { id: 'tile-0-1', type: TileType.Water, imageSrc: ImageType.Water, isOpen: true, isOccupied: false },
                ],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], SMALL_MOVEMENT);
            expect(result).toEqual([grid[0][0], grid[0][1], grid[0][2]]);
        });

        it('should throw an error for unknown tile types', () => {
            const grid: Tile[][] = [
                [
                    { id: 'tile-0-0', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false },
                    { id: 'tile-0-1', type: 'lava' as TileType, imageSrc: ImageType.Water, isOpen: true, isOccupied: false },
                ],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            expect(() => service.availablePath(grid[0][0], SMALL_MOVEMENT)).toThrowError('Unknown tile type: lava');
        });

        it('should correctly handle movement through doors', () => {
            const grid: Tile[][] = [
                [{ id: 'tile-0-0', type: TileType.Door, isOpen: true, imageSrc: ImageType.Default, isOccupied: false }],
                [{ id: 'tile-0-1', type: TileType.Door, isOpen: false, imageSrc: ImageType.Default, isOccupied: false }],
            ];

            mockGridService.getGrid.and.returnValue(grid);

            const resultOpenDoor = service.availablePath(grid[0][0], LARGE_MOVEMENT);
            expect(resultOpenDoor).toBeDefined();

            const resultClosedDoor = service.availablePath(grid[1][0], LARGE_MOVEMENT);
            expect(resultClosedDoor).toBeUndefined();
        });
    });

    describe('quickestPath', () => {
        it('should return undefined if startTile or targetTile is undefined', () => {
            expect(
                service.quickestPath(undefined, {
                    id: 'tile-0-1',
                    type: TileType.Default,
                    imageSrc: ImageType.Default,
                    isOpen: true,
                    isOccupied: false,
                }),
            ).toBeUndefined();
            expect(
                service.quickestPath(
                    { id: 'tile-0-0', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false },
                    undefined,
                ),
            ).toBeUndefined();
        });

        it('should return undefined if targetTile is a wall', () => {
            const grid: Tile[][] = [
                [
                    { id: 'tile-0-0', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                    { id: 'tile-0-1', type: TileType.Wall, imageSrc: ImageType.Wall, isOpen: true, isOccupied: false },
                ],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            expect(service.quickestPath(grid[0][0], grid[0][1])).toBeUndefined();
        });

        it('should return undefined if targetTile is a closed door', () => {
            const grid: Tile[][] = [
                [
                    { id: 'tile-0-0', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                    { id: 'tile-0-1', type: TileType.Door, imageSrc: ImageType.ClosedDoor, isOpen: false, isOccupied: false },
                ],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            expect(service.quickestPath(grid[0][0], grid[0][1])).toBeUndefined();
        });

        it('should return the shortest path considering movement costs', () => {
            const grid: Tile[][] = [
                [
                    { id: 'tile-0-0', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                    { id: 'tile-0-1', type: TileType.Water, imageSrc: ImageType.Water, isOpen: true, isOccupied: false },
                    { id: 'tile-0-2', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                ],
                [{ id: 'tile-1-0', type: TileType.Wall, isOpen: true, imageSrc: ImageType.Wall, isOccupied: false }],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.quickestPath(grid[0][0], grid[0][2]);

            expect(result).toEqual([grid[0][0], grid[0][1], grid[0][2]]);
        });

        it('should return undefined if there is no path', () => {
            const grid: Tile[][] = [
                [
                    { id: 'tile-0-0', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                    { id: 'tile-0-1', type: TileType.Wall, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                    { id: 'tile-0-2', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                ],
                [{ id: 'tile-0-0', type: 'lava' as TileType, isOpen: true, imageSrc: ImageType.Default, isOccupied: false }],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.quickestPath(grid[0][0], grid[0][2]);

            expect(result).toEqual(undefined);
        });
    });

    describe('getNeighbors', () => {
        it('should return the correct neighbors', () => {
            const grid: Tile[][] = [
                [
                    { id: 'tile-0-0', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                    { id: 'tile-0-1', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                ],
                [
                    { id: 'tile-1-0', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                    { id: 'tile-1-1', type: TileType.Default, isOpen: true, imageSrc: ImageType.Default, isOccupied: false },
                ],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const neighbors = service['getNeighbors'](grid[0][0], grid);
            expect(neighbors).toContain(grid[0][1]);
            expect(neighbors).toContain(grid[1][0]);
            expect(neighbors.length).toBe(2);
        });

        it('should return an empty array if tile ID format is invalid', () => {
            const neighbors = service['getNeighbors'](
                { id: 'invalid', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false },
                [],
            );
            expect(neighbors).toEqual([]);
        });
    });

    describe('reconstructPath', () => {
        it('should reconstruct the correct path', () => {
            const tile1 = { id: 'tile-0-0', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false };
            const tile2 = { id: 'tile-0-1', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false };
            const tile3 = { id: 'tile-0-2', type: TileType.Default, imageSrc: ImageType.Default, isOpen: true, isOccupied: false };

            const previous = new Map<Tile, Tile | null>([
                [tile3, tile2],
                [tile2, tile1],
                [tile1, null],
            ]);

            const result = service['reconstructPath'](previous, tile3);
            expect(result).toEqual([tile1, tile2, tile3]);
        });

        it('should return an empty array if target is not in the map', () => {
            const result = service['reconstructPath'](new Map(), null);
            expect(result).toEqual([]);
        });
    });
});
