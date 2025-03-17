import { Item } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Tile, TileType } from '@app/model/database/tile';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GridManagerService } from './grid-manager.service';

describe('GridManagerService', () => {
    let service: GridManagerService;
    let mockGrid: Tile[][];
    let mockPlayer: Player;
    let logger: Logger;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GridManagerService, Logger],
        }).compile();

        service = module.get<GridManagerService>(GridManagerService);
        logger = module.get<Logger>(Logger);
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});

        mockGrid = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: null } as Tile,
                { id: 'tile-0-1', type: TileType.Default, isOpen: true, player: null } as Tile,
            ],
            [
                { id: 'tile-1-0', type: TileType.Default, isOpen: true, player: null } as Tile,
                { id: 'tile-1-1', type: TileType.Wall, isOpen: false, player: null } as Tile,
            ],
        ];

        mockPlayer = { name: 'Player1', spawnPoint: { x: 0, y: 0, tileId: 'tile-0-0' } } as Player;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should find a tile by its ID', () => {
        const tile = service.findTileById(mockGrid, 'tile-0-1');
        expect(tile).toBeDefined();
        expect(tile?.id).toBe('tile-0-1');
    });

    it('should find a tile occupied by a player', () => {
        mockGrid[0][1].player = mockPlayer;
        const tile = service.findTileByPlayer(mockGrid, mockPlayer);
        expect(tile).toBeDefined();
        expect(tile?.player?.name).toBe(mockPlayer.name);
    });

    it('should find the tile corresponding to the player spawn point', () => {
        const spawnTile = service.findTileBySpawnPoint(mockGrid, mockPlayer);
        expect(spawnTile).toBeDefined();
        expect(spawnTile?.id).toBe('tile-0-0');
    });

    it('should check if two tiles are adjacent', () => {
        expect(service.findAndCheckAdjacentTiles('tile-0-0', 'tile-0-1', mockGrid)).toBe(true);
        expect(service.findAndCheckAdjacentTiles('tile-0-0', 'tile-1-1', mockGrid)).toBe(false);
        expect(service.findAndCheckAdjacentTiles('tile-0-0', 'error-0-0', mockGrid)).toBe(false);
    });

    it('should clear a player from the grid', () => {
        mockGrid[0][1].player = mockPlayer;
        service.clearPlayerFromGrid(mockGrid, 'Player1');
        expect(mockGrid[0][1].player).toBeUndefined();
    });

    it('should set a player on a tile', () => {
        service.setPlayerOnTile(mockGrid, mockGrid[1][0], mockPlayer);
        expect(mockGrid[1][0].player).toBe(mockPlayer);
    });

    it('should find spawn points', () => {
        mockGrid[0][0].item = { name: 'home' } as Item;
        const spawnPoints = service.findSpawnPoints(mockGrid);
        expect(spawnPoints.length).toBe(1);
        expect(spawnPoints[0].id).toBe('tile-0-0');
    });

    it('should randomly assign players to available spawn points', () => {
        const players: Player[] = [
            { name: 'Player1', spawnPoint: { x: 0, y: 0, tileId: '' } } as Player,
            { name: 'Player2', spawnPoint: { x: 0, y: 0, tileId: '' } } as Player,
            { name: 'Player3', spawnPoint: { x: 0, y: 0, tileId: '' } } as Player,
        ];

        const spawnPoints: Tile[] = [
            { id: 'tile-0-0', imageSrc: 'img1', isOccupied: false, type: TileType.Default, isOpen: false, item: { name: 'home' } as Item },
            { id: 'tile-1-0', imageSrc: 'img2', isOccupied: false, type: TileType.Default, isOpen: false, item: { name: 'home' } as Item },
            { id: 'tile-2-0', imageSrc: 'img3', isOccupied: false, type: TileType.Default, isOpen: false, item: { name: 'home' } as Item },
        ];

        service.assignPlayersToSpawnPoints(players, spawnPoints, mockGrid);

        const assignedTileIds = players.map((p) => p.spawnPoint.tileId);
        const uniqueTileIds = new Set(assignedTileIds);

        expect(uniqueTileIds.size).toBe(players.length);

        spawnPoints.forEach((spawn) => {
            if (spawn.player) {
                expect(players).toContain(spawn.player);
            }
        });
    });

    it('should leave extra spawn points empty', () => {
        const players: Player[] = [{ name: 'Player1', spawnPoint: { x: 0, y: 0, tileId: '' } } as Player];

        const spawnPoints: Tile[] = [
            { id: 'tile-0-0', imageSrc: 'img1', isOccupied: false, type: TileType.Default, isOpen: false, item: { name: 'home' } as Item },
            { id: 'tile-1-0', imageSrc: 'img2', isOccupied: false, type: TileType.Default, isOpen: false, item: { name: 'home' } as Item },
        ];

        service.assignPlayersToSpawnPoints(players, spawnPoints, mockGrid);

        const assignedSpawn = spawnPoints.find((spawn) => spawn.player === players[0]);
        expect(assignedSpawn).toBeDefined();
        expect(players[0].spawnPoint.tileId).toBe(assignedSpawn?.id);

        const emptySpawn = spawnPoints.find((spawn) => spawn !== assignedSpawn);
        expect(emptySpawn?.player).toBeUndefined();
        expect(emptySpawn?.item).toBeNull();
    });

    it('should teleport a player to an empty tile', () => {
        service.setPlayerOnTile(mockGrid, mockGrid[0][0], mockPlayer);
        service.teleportPlayer(mockGrid, mockPlayer, mockGrid[1][0]);
        expect(mockGrid[0][0].player).toBeUndefined();
        expect(mockGrid[1][0].player).toBe(mockPlayer);
    });

    it('should teleport a player to adjacent available tile if targetTile is spawnPoint even if tile is obstructed-2', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', player: undefined, type: TileType.Door, isOpen: false, item: { name: 'home' } as Item } as Tile,
                { id: 'tile-0-1', player: mockPlayer, type: TileType.Wall } as Tile,
                { id: 'tile-0-2', player: undefined, type: TileType.Wall } as Tile,
                { id: 'tile-0-3', player: undefined, type: TileType.Wall } as Tile,
            ],
            [
                { id: 'tile-1-0', player: undefined, type: TileType.Door, isOpen: false } as Tile,
                { id: 'tile-1-1', player: undefined, type: TileType.Door, isOpen: false } as Tile,
                { id: 'tile-1-2', player: undefined, type: TileType.Wall } as Tile,
                { id: 'tile-1-3', player: undefined, type: TileType.Default } as Tile,
            ],
        ];
        service.teleportPlayer(grid, mockPlayer, grid[0][0]);
        expect(grid[0][1].player).toBeUndefined();
        expect(grid[1][3].player).toBe(mockPlayer);
    });

    it('should not teleport player even if spawnPoint if no available tile', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Wall, player: undefined, isOpen: true } as Tile,
                { id: 'tile-0-1', type: TileType.Door, player: undefined, isOpen: false } as Tile,
            ],
            [
                { id: 'tile-1-0', type: TileType.Default, player: { name: 'Player1' } as Player, isOpen: true } as Tile,
                { id: 'tile-1-1', type: TileType.Default, player: { name: 'Player2' } as Player, isOpen: true } as Tile,
            ],
        ];
        expect(service.teleportPlayer(grid, mockPlayer, grid[0][0])).toBe(grid);
    });

    it('should not teleport if player is not in grid and should send warning', () => {
        expect(service.teleportPlayer(mockGrid, mockPlayer, mockGrid[1][0])).toBe(mockGrid);
        expect(logger.warn).toHaveBeenCalledWith('Player Player1 not found on any tile.');
    });

    it('should not teleport if player is on same til as targetTile', () => {
        service.setPlayerOnTile(mockGrid, mockGrid[0][0], mockPlayer);
        expect(service.teleportPlayer(mockGrid, mockPlayer, mockGrid[0][0])).toBe(mockGrid);
    });

    it('should not teleport if targetTile is obstructed', () => {
        mockGrid[1][0].type = TileType.Wall;
        service.setPlayerOnTile(mockGrid, mockGrid[0][0], mockPlayer);
        expect(service.teleportPlayer(mockGrid, mockPlayer, mockGrid[1][0])).toBe(mockGrid);
    });

    it('should return undefined if no available tile is found', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Wall, player: undefined, isOpen: true } as Tile,
                { id: 'tile-0-1', type: TileType.Door, player: undefined, isOpen: false } as Tile,
            ],
            [
                { id: 'tile-1-0', type: TileType.Default, player: { name: 'Player1' } as Player, isOpen: true } as Tile,
                { id: 'tile-1-1', type: TileType.Default, player: { name: 'Player2' } as Player, isOpen: true } as Tile,
            ],
        ];
        const startTile = grid[0][0];
        const closestTile = (service as any).findClosestAvailableTile(grid, startTile);
        expect(closestTile).toBeUndefined();
    });

    it('should log an error and return null for an invalid tile ID format', () => {
        const invalidTileId = 'invalid-tile-id';

        const result = (service as any).parseTileCoordinates(invalidTileId);

        expect(result).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(`Invalid tile ID format: ${invalidTileId}`);
    });
});
