/* eslint-disable @typescript-eslint/no-magic-numbers */
import { DEFAULT_COST, DOOR_COST, ICE_COST, WALL_COST, WATER_COST } from '@app/constants/constants';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerMovementService } from './player-movement.service';
import { ItemName, TileType } from '@common/enums';

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

        it('should return undefined if startTile is undefined', () => {
            const result = service.quickestPath(undefined, targetTile, grid);
            expect(result).toBeUndefined();
        });

        it('should return undefined if targetTile is undefined', () => {
            const result = service.quickestPath(startTile, undefined, grid);
            expect(result).toBeUndefined();
        });

        it('should return undefined if targetTile is a wall', () => {
            targetTile.type = TileType.Wall;
            const result = service.quickestPath(startTile, targetTile, grid);
            expect(result).toBeUndefined();
        });

        it('should return undefined if grid is undefined', () => {
            const result = service.quickestPath(startTile, targetTile, undefined);
            expect(result).toBeUndefined();
        });

        it('should find the shortest path between two tiles', () => {
            const path = service.quickestPath(startTile, targetTile, grid);
            expect(path).toEqual([startTile, grid[0][1], grid[1][1]]);
        });

        it('should return undefined if path is blocked by walls', () => {
            grid[0][1].type = TileType.Wall;
            grid[1][0].type = TileType.Wall;
            const result = service.quickestPath(startTile, targetTile, grid);
            expect(result).toBeUndefined();
        });

        it('should choose the path with the lowest cost', () => {
            grid[0][1].type = TileType.Ice;
            grid[1][0].type = TileType.Water;
            const path = service.quickestPath(startTile, targetTile, grid);
            const expectedPath = [startTile, grid[0][1], grid[1][1]];
            expect(path).toEqual(expectedPath);
        });
    });

    describe('getMoveCost', () => {
        it('should return correct cost for each tile type', () => {
            expect(service.getMoveCost({ type: TileType.Ice } as Tile)).toBe(ICE_COST);
            expect(service.getMoveCost({ type: TileType.Default } as Tile)).toBe(DEFAULT_COST);
            expect(service.getMoveCost({ type: TileType.Water } as Tile)).toBe(WATER_COST);
            expect(service.getMoveCost({ type: TileType.Wall } as Tile)).toBe(WALL_COST);
            expect(service.getMoveCost({ type: TileType.Door } as Tile)).toBe(DOOR_COST);
        });

        it('should return WALL_COST for unknown tile types', () => {
            expect(service.getMoveCost({ type: 'Unknown' as TileType } as Tile)).toBe(WALL_COST);
        });
    });

    describe('hasAdjacentTileType', () => {
        it('should return true if adjacent tile has the type', () => {
            const grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Door } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const result = service.hasAdjacentTileType(grid[0][0], grid, TileType.Door);
            expect(result).toBe(true);
        });

        it('should return false if no adjacent tiles have the type', () => {
            const grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Default } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const result = service.hasAdjacentTileType(grid[0][0], grid, TileType.Door);
            expect(result).toBe(false);
        });
    });

    describe('hasAdjacentPlayerOrDoor', () => {
        it('should return true if adjacent tile is a door', () => {
            const grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Door } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const result = service.hasAdjacentPlayerOrDoor(grid[0][0], grid);
            expect(result).toBe(true);
        });

        it('should return true if adjacent tile has a player', () => {
            const player: Player = { name: 'test' } as Player;
            const grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Default, player } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const result = service.hasAdjacentPlayerOrDoor(grid[0][0], grid);
            expect(result).toBe(true);
        });

        it('should return false if no adjacent players or doors', () => {
            const grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Default } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const result = service.hasAdjacentPlayerOrDoor(grid[0][0], grid);
            expect(result).toBe(false);
        });
    });

    describe('hasAdjacentPlayer', () => {
        it('should return true if adjacent tile has a player', () => {
            const player: Player = { name: 'test' } as Player;
            const grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Default, player } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const result = service.hasAdjacentPlayer(grid[0][0], grid);
            expect(result).toBe(true);
        });

        it('should return false if no adjacent players', () => {
            const grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Default } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const result = service.hasAdjacentPlayer(grid[0][0], grid);
            expect(result).toBe(false);
        });
    });

    describe('findClosestReachableTile', () => {
        it('should return the farthest reachable tile within movement points', () => {
            const grid = [
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
            ];
            const virtualPlayerTile = grid[0][0];
            const moveTile = grid[0][2];
            const movementPoints = 2;
            const result = service.findClosestReachableTile(moveTile, virtualPlayerTile, grid, movementPoints);
            expect(result).toEqual(grid[0][1]);
        });
    });

    describe('getNeighbors', () => {
        it('should return adjacent tiles for a middle tile', () => {
            const tile = { id: 'tile-1-1' } as Tile;
            const grid = [
                [{ id: 'tile-0-0' } as Tile, { id: 'tile-0-1' } as Tile, { id: 'tile-0-2' } as Tile],
                [{ id: 'tile-1-0' } as Tile, tile, { id: 'tile-1-2' } as Tile],
                [{ id: 'tile-2-0' } as Tile, { id: 'tile-2-1' } as Tile, { id: 'tile-2-2' } as Tile],
            ];
            const neighbors = service.getNeighbors(tile, grid);
            expect(neighbors.length).toBe(4);
        });

        it('should return empty array for invalid tile ID', () => {
            const tile = { id: 'invalid' } as Tile;
            const neighbors = service.getNeighbors(tile, [[]]);
            expect(neighbors).toEqual([]);
        });
    });

    describe('findBestMoveTile', () => {
        it('should select the tile with the lowest path cost', () => {
            const grid = [
                [{ id: 'tile-0-0', type: TileType.Default } as Tile, { id: 'tile-0-1', type: TileType.Ice } as Tile],
                [{ id: 'tile-1-0', type: TileType.Default } as Tile, { id: 'tile-1-1', type: TileType.Default } as Tile],
            ];
            const moveTile = grid[1][1];
            const virtualPlayerTile = grid[0][0];
            const player: Player = { name: 'test' } as Player;
            virtualPlayerTile.player = player;
            const result = service.findBestMoveTile(moveTile, virtualPlayerTile, grid);
            expect(result).toEqual(grid[0][1]);
        });
    });

    describe('trimPathAtObstacle', () => {
        it('should trim path at closed door', () => {
            const path = [{ type: TileType.Default }, { type: TileType.Door, isOpen: false }, { type: TileType.Default }] as Tile[];
            const trimmed = service.trimPathAtObstacle(path);
            expect(trimmed.length).toBe(2);
        });

        it('should trim path at item', () => {
            const path = [
                { type: TileType.Default },
                { type: TileType.Default, item: { name: ItemName.Default } },
                { type: TileType.Default },
            ] as Tile[];
            const trimmed = service.trimPathAtObstacle(path);
            expect(trimmed.length).toBe(2);
        });

        it('should not trim path at home item', () => {
            const path = [
                { type: TileType.Default },
                { type: TileType.Default, item: { name: ItemName.Home } },
                { type: TileType.Default },
            ] as Tile[];
            const trimmed = service.trimPathAtObstacle(path);
            expect(trimmed.length).toBe(3);
        });
    });

    describe('getFarthestReachableTile', () => {
        it('should return the farthest tile', () => {
            const grid = [
                [
                    { id: 'tile-0-0', type: TileType.Default } as Tile,
                    { id: 'tile-0-1', type: TileType.Default } as Tile,
                    { id: 'tile-0-2', type: TileType.Default } as Tile,
                ],
            ];
            const virtualPlayerTile = grid[0][0];
            const targetTile = grid[0][2];
            const movementPoints = 2;
            const result = service.getFarthestReachableTile(virtualPlayerTile, targetTile, grid, movementPoints);
            expect(result).toEqual(grid[0][2]);
        });
        it('should return the farthest tile within movement points', () => {
            const grid = [
                [
                    { id: 'tile-0-0', type: TileType.Default } as Tile,
                    { id: 'tile-0-1', type: TileType.Default } as Tile,
                    { id: 'tile-0-2', type: TileType.Default } as Tile,
                    { id: 'tile-0-3', type: TileType.Default } as Tile,
                    { id: 'tile-0-4', type: TileType.Default } as Tile,
                ],
            ];
            const virtualPlayerTile = grid[0][0];
            const targetTile = grid[0][4];
            const movementPoints = 2;
            const result = service.getFarthestReachableTile(virtualPlayerTile, targetTile, grid, movementPoints);
            expect(result).toEqual(grid[0][2]);
        });
    });
});
