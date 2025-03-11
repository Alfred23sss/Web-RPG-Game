/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { TileType } from '@app/enums/global.enums';
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
            mockGridService.getGrid.and.returnValue(mockTiles());
            const invalidTiles = [undefined, createTile('tile-0-0', TileType.Wall), createTile('tile-0-0', TileType.Door, false)];

            invalidTiles.forEach((tile) => {
                expect(service.availablePath(tile as Tile, 5)).toEqual([]);
            });
        });

        it('should handle blocked neighbors', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Wall)],
                [createTile('tile-1-0', TileType.Door, false), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 2);
            expect(result).toEqual([grid[0][0]]);
        });

        it('should calculate reachable tiles correctly', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Ice)],
                [createTile('tile-1-0', TileType.Water), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 3);
            expect(result.map((t) => t.id)).toEqual(jasmine.arrayWithExactContents(['tile-0-0', 'tile-0-1', 'tile-1-0', 'tile-1-1']));
        });

        it('should handle invalid tile ID in getNeighbors', () => {
            const grid = [[createTile('invalid_id', TileType.Default), createTile('tile-0-1', TileType.Default)]];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 2);
            expect(result).toEqual([grid[0][0]]);
        });

        it('should handle unknown tile types', () => {
            const grid = [[createTile('tile-0-0', TileType.Default), createTile('tile-0-1', 'Unknown' as TileType)]];
            mockGridService.getGrid.and.returnValue(grid);

            const result = service.availablePath(grid[0][0], 1);
            expect(result).toEqual([grid[0][0]]);
        });
    });

    describe('quickestPath', () => {
        it('should return undefined for invalid inputs', () => {
            mockGridService.getGrid.and.returnValue(mockTiles());
            const tests = [
                { start: undefined, target: mockTiles()[0][0] },
                { start: mockTiles()[0][0], target: undefined },
                { start: mockTiles()[0][0], target: createTile('tile-1-1', TileType.Wall) },
            ];

            tests.forEach(({ start, target }) => {
                expect(service.quickestPath(start as Tile, target as Tile)).toBeUndefined();
            });
        });

        it('should find shortest path considering movement costs', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Water)],
                [createTile('tile-1-0', TileType.Ice), createTile('tile-1-1', TileType.Default)],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const path = service.quickestPath(grid[0][0], grid[1][1]);
            expect(path?.map((t) => t.id)).toEqual(['tile-0-0', 'tile-1-0', 'tile-1-1']);
        });

        it('should handle unreachable targets', () => {
            const grid = [[createTile('tile-0-0', TileType.Default)], [createTile('tile-1-0', TileType.Wall)]];
            mockGridService.getGrid.and.returnValue(grid);

            expect(service.quickestPath(grid[0][0], grid[1][0])).toBeUndefined();
        });

        it('should return undefined when path is completely blocked', () => {
            const grid = [
                [createTile('tile-0-0', TileType.Default), createTile('tile-0-1', TileType.Wall)],
                [createTile('tile-1-0', TileType.Door, false), createTile('tile-1-1', TileType.Water)],
            ];
            mockGridService.getGrid.and.returnValue(grid);

            const start = grid[0][0];
            const target = grid[1][1];
            expect(service.quickestPath(start, target)).toBeUndefined();
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
});
