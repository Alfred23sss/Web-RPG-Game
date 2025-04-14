/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { TileType } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GridService } from '@app/services/grid/grid-service.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';

describe('PlayerMovementService', () => {
    let service: PlayerMovementService;
    let mockGridService: jasmine.SpyObj<GridService>;

    const createTile = (id: string, type: TileType, isOpen = false): Tile => ({
        id,
        type,
        imageSrc: '',
        isOccupied: false,
        isOpen,
    });

    const mockTiles = (): Tile[][] => [
        [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Water)],
        [createTile('tile-1-0', TileType.Ice), createTile('tile-1-1', TileType.Wall)],
    ];

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
        it('should return empty array for invalid start tile', () => {
            const grid = mockTiles();
            mockGridService.getGrid.and.returnValue(grid);
            const invalidTiles = [undefined, createTile('tile-0-0', TileType.Wall), createTile('tile-0-0', TileType.Door, false)];

            invalidTiles.forEach((tile) => {
                expect(service.availablePath(tile as Tile, 5, grid)).toEqual([]);
            });
        });

        it('should handle blocked neighbors', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Wall)],
                [createTile('tile-1-0', TileType.Door, false), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 2, grid);
            expect(result).toEqual([grid[0][0]]);
        });

        it('should calculate reachable tiles correctly', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Ice)],
                [createTile('tile-1-0', TileType.Water), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 3, grid);
            expect(result.map((t) => t.id)).toEqual(jasmine.arrayWithExactContents(['tile-0-0', 'tile-0-1', 'tile-1-0', 'tile-1-1']));
        });

        it('should handle undefined dequeued element gracefully', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Ice)],
                [createTile('tile-1-0', TileType.Water), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);
            spyOn<any>(service, 'getNeighborAndCost').and.returnValue(undefined);

            const result = service.availablePath(grid[0][0], 3, grid);
            expect(result.map((t) => t.id)).toEqual(jasmine.arrayWithExactContents(['tile-0-0', 'tile-0-1', 'tile-1-0']));
        });

        it('should handle invalid tile ID in getNeighbors', () => {
            const grid = [[createTile('invalid_id', TileType.Default), createTile('tile-0-1', TileType.Default)]];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 2, grid);
            expect(result).toEqual([grid[0][0]]);
        });

        it('should handle unknown tile types', () => {
            const grid = [[createTile('tile-0-0', TileType.Default), createTile('tile-0-1', 'Unknown' as TileType)]];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 1, grid);
            expect(result).toEqual([grid[0][0]]);
        });
    });

    describe('quickestPath', () => {
        it('should return undefined for invalid inputs', () => {
            const grid = mockTiles();
            mockGridService.getGrid.and.returnValue(grid);
            const tests = [
                { start: undefined, target: grid[0][0] },
                { start: grid[0][0], target: undefined },
                { start: grid[0][0], target: createTile('tile-1-1', TileType.Wall) },
            ];

            tests.forEach(({ start, target }) => {
                expect(service.quickestPath(start as Tile, target as Tile, grid)).toBeUndefined();
            });
        });

        it('should handle undefined dequeued element gracefully', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Water)],
                [createTile('tile-1-0', TileType.Ice), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);
            spyOn<any>(service, 'getNeighborAndCost').and.returnValue(undefined);

            const path = service.quickestPath(grid[0][0], grid[1][1], grid);
            expect(path?.map((t) => t.id)).toBe(undefined);
        });

        it('should find shortest path considering movement costs', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Water)],
                [createTile('tile-1-0', TileType.Ice), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const path = service.quickestPath(grid[0][0], grid[1][1], grid);
            expect(path?.map((t) => t.id)).toEqual(['tile-0-0', 'tile-1-0', 'tile-1-1']);
        });

        it('should handle unreachable targets', () => {
            const grid = [[createTile('tile-0-0', TileType.Default)], [createTile('tile-1-0', TileType.Wall)]];
            mockGridService.getGrid.and.returnValue(grid);

            expect(service.quickestPath(grid[0][0], grid[1][0], grid)).toBeUndefined();
        });
    });

    describe('getNeighbors', () => {
        it('should return adjacent tiles', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Default)],
                [createTile('tile-1-0', TileType.Default), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const neighbors = service['getNeighbors'](grid[0][0], grid);
            expect(neighbors.map((t) => t.id)).toEqual(['tile-0-1', 'tile-1-0']);
        });

        it('should handle grid edges', () => {
            const grid = [[createTile('tile-0-0', TileType.Default)]];
            mockGridService.getGrid.and.returnValue(grid);

            const neighbors = service['getNeighbors'](grid[0][0], grid);
            expect(neighbors).toEqual([]);
        });
    });

    describe('reconstructPath', () => {
        it('should build path from target to start', () => {
            const tile1 = createTile('tile-0-0', TileType.Default);
            const tile2 = createTile('tile-0-1', TileType.Default);
            const previous = new Map<Tile, Tile | null>([
                [tile1, null],
                [tile2, tile1],
            ]);

            const path = service['reconstructPath'](previous, tile2);
            expect(path).toEqual([tile1, tile2]);
        });
    });

    describe('helper methods', () => {
        it('isNeighborBlocked should detect blocked tiles', () => {
            const blockedTiles = [createTile('tile-0-0', TileType.Wall), createTile('tile-0-1', TileType.Door, false)];
            blockedTiles.forEach((tile) => {
                expect(service['isNeighborBlocked'](tile)).toBeTrue();
            });
        });

        it('getMoveCost should return correct costs', () => {
            const tests: [Tile, number][] = [
                [createTile('tile-0-0', TileType.Ice), 0],
                [createTile('tile-0-1', TileType.Water), 2],
                [createTile('tile-1-0', TileType.Default), 1],
                [createTile('tile-1-1', TileType.Wall), Infinity],
            ];

            tests.forEach(([tile, expected]) => {
                expect(service['getMoveCost'](tile)).toBe(expected);
            });
        });

        it('isValidNeighbor should validate correctly', () => {
            const tests: [Tile, boolean][] = [
                [createTile('door-closed', TileType.Door, false), false],
                [createTile('door-open', TileType.Door, true), true],
                [createTile('wall', TileType.Wall), true],
                [createTile('default', TileType.Default), true],
            ];

            tests.forEach(([tile, expected]) => {
                expect(service['isValidNeighbor'](tile)).toBe(expected);
            });
        });
    });

    describe('edge cases', () => {
        it('should handle movement cost fallback', () => {
            const tile = createTile('tile-0-0', 'UndefinedType' as TileType);
            expect(service['getMoveCost'](tile)).toBe(Infinity);
        });
    });

    describe('calculateRemainingMovementPoints', () => {
        let player: Player;

        beforeEach(() => {
            player = { name: 'player1', movementPoints: 5 } as Player;
        });

        it('should return the movement cost of the given tile if tile is defined', () => {
            const tile: Tile = { id: 'tile-1-1', type: TileType.Water, isOpen: true, isOccupied: false, imageSrc: '' };
            expect(service.calculateRemainingMovementPoints(tile, player)).toBe(2);
        });

        it('should return the player movement points if tile is undefined', () => {
            expect(service.calculateRemainingMovementPoints(undefined, player)).toBe(5);
        });

        it('should return Infinity if the tile type is not found in movement costs', () => {
            const tile: Tile = { id: 'tile-2-2', type: TileType.Wall, isOpen: false, isOccupied: false, imageSrc: '' };
            expect(service.calculateRemainingMovementPoints(tile, player)).toBe(Infinity);
        });
    });

    describe('hasAdjacentPlayerOrDoor', () => {
        it('should return true when there is an adjacent player', () => {
            const centerTile = createTile('center', TileType.Default);
            const grid = mockTiles();
            const tileWithPlayer = createTile('player-tile', TileType.Default);
            tileWithPlayer.player = {} as Player;
            spyOn<any>(service, 'getNeighbors').and.returnValue([
                createTile('normal', TileType.Default),
                tileWithPlayer,
                createTile('water', TileType.Water),
            ]);
            const result = service.hasAdjacentPlayerOrDoor(centerTile, grid);
            expect(result).toBeTrue();
            expect((service as any).getNeighbors).toHaveBeenCalledWith(centerTile, grid);
        });
        it('should return true when there is an adjacent door', () => {
            const centerTile = createTile('center', TileType.Default);
            const grid = mockTiles();
            const doorTile = createTile('door', TileType.Door);
            spyOn<any>(service, 'getNeighbors').and.returnValue([
                createTile('normal', TileType.Default),
                doorTile,
                createTile('water', TileType.Water),
            ]);
            const result = service.hasAdjacentPlayerOrDoor(centerTile, grid);
            expect(result).toBeTrue();
            expect((service as any).getNeighbors).toHaveBeenCalledWith(centerTile, grid);
        });
        it('should return true when there are both adjacent players and doors', () => {
            const centerTile = createTile('center', TileType.Default);
            const grid = mockTiles();
            const doorTile = createTile('door', TileType.Door);
            const tileWithPlayer = createTile('player-tile', TileType.Default);
            tileWithPlayer.player = {} as Player;
            spyOn<any>(service, 'getNeighbors').and.returnValue([createTile('normal', TileType.Default), doorTile, tileWithPlayer]);

            const result = service.hasAdjacentPlayerOrDoor(centerTile, grid);
            expect(result).toBeTrue();
            expect((service as any).getNeighbors).toHaveBeenCalledWith(centerTile, grid);
        });

        it('should return false when there are no adjacent players or doors', () => {
            const centerTile = createTile('center', TileType.Default);
            const grid = mockTiles();
            spyOn<any>(service, 'getNeighbors').and.returnValue([
                createTile('normal1', TileType.Default),
                createTile('normal2', TileType.Default),
                createTile('water', TileType.Water),
            ]);
            const result = service.hasAdjacentPlayerOrDoor(centerTile, grid);
            expect(result).toBeFalse();
            expect((service as any).getNeighbors).toHaveBeenCalledWith(centerTile, grid);
        });

        it('should return false when there are no neighbors', () => {
            const centerTile = createTile('center', TileType.Default);
            const grid = mockTiles();
            spyOn<any>(service, 'getNeighbors').and.returnValue([]);
            const result = service.hasAdjacentPlayerOrDoor(centerTile, grid);
            expect(result).toBeFalse();
            expect((service as any).getNeighbors).toHaveBeenCalledWith(centerTile, grid);
        });
    });

    it('should return true when adjacent tile matches type', () => {
        const clientPlayerTile = createTile('tile-0-0', TileType.Default);
        const grid = mockTiles();
        const neighborsWithTargetType = [createTile('tile-0-1', TileType.Water), createTile('tile-1-0', TileType.Ice)];
        spyOn<any>(service, 'getNeighbors').and.returnValue(neighborsWithTargetType);

        expect(service.hasAdjacentTileType(clientPlayerTile, grid, TileType.Water)).toBeTrue();
        expect(service['getNeighbors']).toHaveBeenCalledWith(clientPlayerTile, grid);
    });
});
