/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { DEFAULT_COST, DOOR_COST, ICE_COST, WALL_COST, WATER_COST } from '@app/constants/constants';
import { Tile } from '@app/interfaces/tile';
import { Player } from '@app/model/database/player';
import { TileType } from '@common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerMovementService } from './player-movement.service';

describe('PlayerMovementService', () => {
    let service: PlayerMovementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PlayerMovementService],
        }).compile();

        service = module.get<PlayerMovementService>(PlayerMovementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('quickestPath', () => {
        let grid: Tile[][];
        let startTile: Tile;
        let targetTile: Tile;

        beforeEach(() => {
            grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Default } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            startTile = grid[0][0];
            targetTile = grid[1][1];
        });

        it('should return a valid path for a reachable target', () => {
            const path = service.quickestPath(startTile, targetTile, grid);
            expect(path).toBeDefined();
            expect(path?.[0]).toEqual(startTile);
            expect(path?.[path.length - 1]).toEqual(targetTile);
        });

        it('should return undefined when startTile is undefined', () => {
            const path = service.quickestPath(undefined, targetTile, grid);
            expect(path).toBeUndefined();
        });

        it('should return undefined when targetTile is undefined', () => {
            const path = service.quickestPath(startTile, undefined, grid);
            expect(path).toBeUndefined();
        });

        it('should return undefined when grid is undefined', () => {
            const path = service.quickestPath(startTile, targetTile, undefined);
            expect(path).toBeUndefined();
        });

        it('should return undefined if targetTile is a wall', () => {
            targetTile.type = TileType.Wall;
            const path = service.quickestPath(startTile, targetTile, grid);
            expect(path).toBeUndefined();
        });

        it('should return undefined when there is no possible path', () => {
            grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Wall } as Tile],
                [{ id: 'tile-1-0', type: TileType.Wall } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const path = service.quickestPath(startTile, targetTile, grid);
            expect(path).toBeUndefined();
        });

        it('should return a multi-step path on a larger grid', () => {
            grid = [
                [
                    { id: 'tile-0-0', type: TileType.Default } as Tile,
                    { id: 'tile-0-1', type: TileType.Default } as Tile,
                    { id: 'tile-0-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-1-0', type: TileType.Default } as Tile,
                    { id: 'tile-1-1', type: TileType.Default } as Tile,
                    { id: 'tile-1-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-2-0', type: TileType.Default } as Tile,
                    { id: 'tile-2-1', type: TileType.Default } as Tile,
                    { id: 'tile-2-2', type: TileType.Default } as Tile,
                ],
            ];
            startTile = grid[0][0];
            targetTile = grid[2][2];
            const path = service.quickestPath(startTile, targetTile, grid);
            expect(path).toBeDefined();
            expect(path?.[0]).toEqual(startTile);
            expect(path?.[path.length - 1]).toEqual(targetTile);
        });
    });

    describe('getMoveCost', () => {
        it('should return ICE_COST for Ice tiles', () => {
            const tile = { id: 'tile-0-0', type: TileType.Ice } as Tile;
            expect(service.getMoveCost(tile)).toEqual(ICE_COST);
        });

        it('should return DEFAULT_COST for Default tiles', () => {
            const tile = { id: 'tile-0-0', type: TileType.Default } as Tile;
            expect(service.getMoveCost(tile)).toEqual(DEFAULT_COST);
        });

        it('should return WATER_COST for Water tiles', () => {
            const tile = { id: 'tile-0-0', type: TileType.Water } as Tile;
            expect(service.getMoveCost(tile)).toEqual(WATER_COST);
        });

        it('should return WALL_COST for Wall tiles', () => {
            const tile = { id: 'tile-0-0', type: TileType.Wall } as Tile;
            expect(service.getMoveCost(tile)).toEqual(WALL_COST);
        });

        it('should return DOOR_COST for Door tiles', () => {
            const tile = { id: 'tile-0-0', type: TileType.Door } as Tile;
            expect(service.getMoveCost(tile)).toEqual(DOOR_COST);
        });

        it('should return WALL_COST for an unknown tile type', () => {
            const tile = { id: 'tile-0-0', type: 'unknown' as unknown } as Tile;
            expect(service.getMoveCost(tile)).toEqual(WALL_COST);
        });
    });

    describe('getNeighbors', () => {
        it('should return valid neighbors based on tile id', () => {
            const grid: Tile[][] = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Default } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const tile = grid[0][0];
            const neighbors = service.getNeighbors(tile, grid);
            expect(neighbors.length).toEqual(2);
            expect(neighbors.find((t) => t.id === 'tile-0-1')).toBeDefined();
            expect(neighbors.find((t) => t.id === 'tile-1-0')).toBeDefined();
        });

        it('should return an empty array if the tile id does not match the pattern', () => {
            const grid: Tile[][] = [[{ id: 'invalid', type: TileType.Default } as Tile]];
            const neighbors = service.getNeighbors(grid[0][0], grid);
            expect(neighbors).toEqual([]);
        });
    });

    describe('hasAdjacentTileType', () => {
        let grid: Tile[][];
        let centerTile: Tile;
        beforeEach(() => {
            grid = [
                [
                    { id: 'tile-0-0', type: TileType.Default } as Tile,
                    { id: 'tile-0-1', type: TileType.Water } as Tile,
                    { id: 'tile-0-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-1-0', type: TileType.Default } as Tile,
                    { id: 'tile-1-1', type: TileType.Default } as Tile,
                    { id: 'tile-1-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-2-0', type: TileType.Default } as Tile,
                    { id: 'tile-2-1', type: TileType.Default } as Tile,
                    { id: 'tile-2-2', type: TileType.Default } as Tile,
                ],
            ];
            centerTile = grid[1][1];
        });

        it('should return true when an adjacent tile matches the given type', () => {
            expect(service.hasAdjacentTileType(centerTile, grid, TileType.Water)).toBe(true);
        });

        it('should return false if no adjacent tile matches the given type', () => {
            expect(service.hasAdjacentTileType(centerTile, grid, TileType.Ice)).toBe(false);
        });
    });

    describe('hasAdjacentPlayerOrDoor', () => {
        let grid: Tile[][];
        let centerTile: Tile;
        beforeEach(() => {
            grid = [
                [
                    { id: 'tile-0-0', type: TileType.Default } as Tile,
                    { id: 'tile-0-1', type: TileType.Door, isOpen: true } as Tile,
                    { id: 'tile-0-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-1-0', type: TileType.Default } as Tile,
                    { id: 'tile-1-1', type: TileType.Default } as Tile,
                    { id: 'tile-1-2', type: TileType.Default, player: { name: 'other' } } as Tile,
                ],
                [
                    { id: 'tile-2-0', type: TileType.Default } as Tile,
                    { id: 'tile-2-1', type: TileType.Default } as Tile,
                    { id: 'tile-2-2', type: TileType.Default } as Tile,
                ],
            ];
            centerTile = grid[1][1];
        });

        it('should return true if an adjacent tile is a door', () => {
            grid[0][1].type = TileType.Door;
            expect(service.hasAdjacentPlayerOrDoor(centerTile, grid)).toBe(true);
        });

        it('should return true if an adjacent tile has a player', () => {
            grid[0][1].type = TileType.Default;
            expect(service.hasAdjacentPlayerOrDoor(centerTile, grid)).toBe(true);
        });

        it('should return false if no adjacent tile is a door or has a player', () => {
            grid[0][1].type = TileType.Default;
            grid[1][2].player = undefined;
            expect(service.hasAdjacentPlayerOrDoor(centerTile, grid)).toBe(false);
        });
    });

    describe('hasAdjacentPlayer', () => {
        let grid: Tile[][];
        let centerTile: Tile;
        beforeEach(() => {
            grid = [
                [
                    { id: 'tile-0-0', type: TileType.Default } as Tile,
                    { id: 'tile-0-1', type: TileType.Default, player: { name: 'other' } } as Tile,
                    { id: 'tile-0-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-1-0', type: TileType.Default } as Tile,
                    { id: 'tile-1-1', type: TileType.Default } as Tile,
                    { id: 'tile-1-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-2-0', type: TileType.Default } as Tile,
                    { id: 'tile-2-1', type: TileType.Default } as Tile,
                    { id: 'tile-2-2', type: TileType.Default } as Tile,
                ],
            ];
            centerTile = grid[1][1];
        });

        it('should return true if an adjacent tile has a player', () => {
            grid[0][1].player = { name: 'other' } as unknown as Player;
            expect(service.hasAdjacentPlayer(centerTile, grid)).toBe(true);
        });

        it('should return false if no adjacent tile has a player', () => {
            grid[0][1].player = undefined;
            expect(service.hasAdjacentPlayer(centerTile, grid)).toBe(false);
        });
    });

    describe('trimPathAtObstacle', () => {
        it('should return the full path if no obstacles are encountered', () => {
            const path: Tile[] = [
                { id: 'tile-0-0', type: TileType.Default } as Tile,
                { id: 'tile-0-1', type: TileType.Default } as Tile,
                { id: 'tile-0-2', type: TileType.Default } as Tile,
            ];
            const result = service.trimPathAtObstacle(path);
            expect(result).toEqual(path);
        });

        it('should trim the path at a closed door', () => {
            const path: Tile[] = [
                { id: 'tile-0-0', type: TileType.Default } as Tile,
                { id: 'tile-0-1', type: TileType.Door, isOpen: false } as Tile,
                { id: 'tile-0-2', type: TileType.Default } as Tile,
            ];
            const result = service.trimPathAtObstacle(path);
            expect(result).toEqual(path.slice(0, 2));
        });

        it('should trim the path at a tile with a non-home item', () => {
            const path: Tile[] = [
                { id: 'tile-0-0', type: TileType.Default } as Tile,
                { id: 'tile-0-1', type: TileType.Default, item: { name: 'NotHome' } } as Tile,
                { id: 'tile-0-2', type: TileType.Default } as Tile,
            ];
            const result = service.trimPathAtObstacle(path);
            expect(result).toEqual(path.slice(0, 2));
        });

        it('should trim the path at a tile that has a player', () => {
            const path: Tile[] = [
                { id: 'tile-0-0', type: TileType.Default } as Tile,
                { id: 'tile-0-1', type: TileType.Default, player: { name: 'someone' } } as Tile,
                { id: 'tile-0-2', type: TileType.Default } as Tile,
            ];
            const result = service.trimPathAtObstacle(path);
            expect(result).toEqual(path.slice(0, 2));
        });
    });

    describe('getFarthestReachableTile', () => {
        let grid: Tile[][];
        let targetTile: Tile;
        let virtualTile: Tile;
        beforeEach(() => {
            grid = [
                [
                    { id: 'tile-0-0', type: TileType.Default } as Tile,
                    { id: 'tile-0-1', type: TileType.Default } as Tile,
                    { id: 'tile-0-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-1-0', type: TileType.Default } as Tile,
                    { id: 'tile-1-1', type: TileType.Default } as Tile,
                    { id: 'tile-1-2', type: TileType.Default } as Tile,
                ],
                [
                    { id: 'tile-2-0', type: TileType.Default } as Tile,
                    { id: 'tile-2-1', type: TileType.Default } as Tile,
                    { id: 'tile-2-2', type: TileType.Default } as Tile,
                ],
            ];
            targetTile = grid[2][2];
            virtualTile = { ...grid[0][0], player: { name: 'testPlayer' } } as Tile;
        });

        it('should return a farther tile when enough movement points are provided', () => {
            const movementPoints = 10;
            const result = service.getFarthestReachableTile(virtualTile, targetTile, grid, movementPoints);
            expect(result).toBeDefined();
            expect(result?.id).not.toEqual(virtualTile.id);
        });
    });

    describe('findClosestReachableTile and findBestMoveTile', () => {
        let grid: Tile[][];
        let moveTile: Tile;
        let virtualTile: Tile;
        beforeEach(() => {
            grid = [
                [
                    { id: 'tile-0-0', type: TileType.Default } as Tile,
                    { id: 'tile-0-1', type: TileType.Default } as Tile,
                    { id: 'tile-0-2', type: TileType.Default } as Tile,
                ],
            ];
            moveTile = grid[0][2];
            virtualTile = { ...grid[0][0], player: { name: 'testPlayer' } } as Tile;
        });

        it('should return undefined when no valid best move tile is found', () => {
            grid[0][1].type = TileType.Wall;
            const result = service.findClosestReachableTile(moveTile, virtualTile, grid, 10);
            expect(result).toBeUndefined();
        });

        it('should return the farthest reachable tile toward the best move tile', () => {
            const result = service.findClosestReachableTile(moveTile, virtualTile, grid, 10);
            expect(result).toBeDefined();
            expect(result?.id).toEqual('tile-0-1');
        });
    });

    it('should GreatShield path when tile has a player (player present in path)', () => {
        const tileWithPlayer: Tile = {
            id: 'tile-0-1',
            type: TileType.Default,
            imageSrc: '',
            isOccupied: true,
            isOpen: true,
            player: { name: 'Enemy' } as Player,
        };

        const tileStart: Tile = {
            id: 'tile-0-0',
            type: TileType.Default,
            imageSrc: '',
            isOccupied: false,
            isOpen: true,
        };

        const targetTile: Tile = {
            id: 'tile-0-2',
            type: TileType.Default,
            imageSrc: '',
            isOccupied: false,
            isOpen: true,
        };

        const grid: Tile[][] = [[tileStart, tileWithPlayer, targetTile]];

        jest.spyOn(service, 'quickestPath').mockReturnValue([tileStart, tileWithPlayer, targetTile]);

        const result = service.getFarthestReachableTile(tileStart, targetTile, grid, 5);

        expect(result).toEqual(tileStart);
    });

    it('should break progression when movement points are insufficient for the next tile', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Default } as Tile,
                { id: 'tile-0-1', type: TileType.Default } as Tile,
                { id: 'tile-0-2', type: TileType.Default } as Tile,
            ],
        ];
        const virtualPlayerTile = { ...grid[0][0], player: { name: 'testPlayer' } } as Tile;
        const targetTile = grid[0][2];
        const movementPoints = 0;
        const result = service.getFarthestReachableTile(virtualPlayerTile, targetTile, grid, movementPoints);
        expect(result.id).toEqual(virtualPlayerTile.id);
    });

    describe('PlayerMovementService - Additional branch coverage', () => {
        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [PlayerMovementService],
            }).compile();
            service = module.get<PlayerMovementService>(PlayerMovementService);
        });

        it('should break out of loop in quickestPath when queue.shift returns undefined', () => {
            const grid: Tile[][] = [[{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Default } as Tile]];
            const startTile = grid[0][0];
            const targetTile = grid[0][1];
            const shiftSpy = jest.spyOn(Array.prototype, 'shift').mockReturnValue(undefined);
            const result = service.quickestPath(startTile, targetTile, grid);
            expect(result).toBeUndefined();
            shiftSpy.mockRestore();
        });

        it('should return undefined in getNeighbors when tile is falsy', () => {
            const grid: Tile[][] = [[{ id: 'tile-0-0', type: TileType.Default } as Tile]];
            const result = service.getNeighbors(null, grid);
            expect(result).toBeUndefined();
        });

        it('should return undefined in getFarthestReachableTile when quickestPath returns undefined', () => {
            const grid: Tile[][] = [[{ id: 'tile-0-0', type: TileType.Default } as Tile]];
            const virtualPlayerTile = grid[0][0];
            const targetTile = { id: 'tile-9-9', type: TileType.Default } as Tile;
            const movementPoints = 10;
            const result = service.getFarthestReachableTile(virtualPlayerTile, targetTile, grid, movementPoints);
            expect(result).toBeUndefined();
        });

        it('should return true in isValidNeighborForVirtualPlayer for a valid tile type', () => {
            const tile: Tile = { id: 'tile-0-0', type: TileType.Default } as Tile;
            const virtualPlayer: Player = { name: 'testPlayer' } as Player;
            const result = (service as any).isValidNeighborForVirtualPlayer(tile, virtualPlayer);
            expect(result).toBe(true);
        });

        it('should correctly update state in processNeighbors for a valid neighbor', () => {
            const tileA: Tile = { id: 'tile-0-0', type: TileType.Default } as Tile;
            const tileB: Tile = { id: 'tile-0-1', type: TileType.Default } as Tile;
            const grid: Tile[][] = [[tileA, tileB]];
            const context = { currentTile: tileA, currentCost: 0, grid };
            const state = {
                queue: [] as { tile: Tile; cost: number }[],
                costs: new Map<Tile, number>(),
                previous: new Map<Tile, Tile | null>(),
            };
            (service as any).processNeighbors(context, state);
            expect(state.queue).toEqual(expect.arrayContaining([{ tile: tileB, cost: service.getMoveCost(tileB) }]));
            expect(state.previous.get(tileB)).toEqual(tileA);
        });
    });
    it('should return false in isValidNeighborForVirtualPlayer if tile has a player with a different name', () => {
        const tile: Tile = { id: 'tile-0-0', type: TileType.Default, player: { name: 'otherPlayer' } } as Tile;
        const virtualPlayer: Player = { name: 'testPlayer' } as Player;
        const result = (service as any).isValidNeighborForVirtualPlayer(tile, virtualPlayer);
        expect(result).toBe(false);
    });
});
