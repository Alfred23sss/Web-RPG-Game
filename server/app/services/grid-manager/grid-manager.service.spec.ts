import { Player } from '@app/interfaces/Player';
import { Tile, TileType } from '@app/model/database/tile';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GridManagerService } from './grid-manager.service';

describe('GridManagerService', () => {
    let service: GridManagerService;
    let mockGrid: Tile[][];
    let mockPlayer: Player;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GridManagerService, Logger],
        }).compile();

        service = module.get<GridManagerService>(GridManagerService);
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

    // it('should return undefined if player is not found on any tile', () => {
    //     const tile = service.findTileByPlayer(mockGrid, mockPlayer);
    //     expect(tile).toBeUndefined();
    // });

    // it('should check if two tiles are adjacent', () => {
    //     expect(service.findAndCheckAdjacentTiles('tile-0-0', 'tile-0-1', mockGrid)).toBe(true);
    //     expect(service.findAndCheckAdjacentTiles('tile-0-0', 'tile-1-1', mockGrid)).toBe(false);
    // });

    // it('should clear a player from the grid', () => {
    //     mockGrid[0][1].player = mockPlayer;
    //     service.clearPlayerFromGrid(mockGrid, 'Player1');
    //     expect(mockGrid[0][1].player).toBeUndefined();
    // });

    // it('should set a player on a tile', () => {
    //     service.setPlayerOnTile(mockGrid, mockGrid[1][0], mockPlayer);
    //     expect(mockGrid[1][0].player).toBe(mockPlayer);
    // });

    // it('should find spawn points', () => {
    //     mockGrid[0][0].item = { name: 'home' } as Item;
    //     const spawnPoints = service.findSpawnPoints(mockGrid);
    //     expect(spawnPoints.length).toBe(1);
    //     expect(spawnPoints[0].id).toBe('tile-0-0');
    // });

    // it('should teleport a player to an empty tile', () => {
    //     service.setPlayerOnTile(mockGrid, mockGrid[0][0], mockPlayer);
    //     service.teleportPlayer(mockGrid, mockPlayer, mockGrid[1][0]);
    //     expect(mockGrid[0][0].player).toBeUndefined();
    //     expect(mockGrid[1][0].player).toBe(mockPlayer);
    // });

    // it('should not teleport a player if the target tile is occupied', () => {
    //     const anotherPlayer = { name: 'Player2', spawnPoint: { x: 1, y: 0, tileId: 'tile-1-0' } } as Player;
    //     service.setPlayerOnTile(mockGrid, mockGrid[0][0], mockPlayer);
    //     service.setPlayerOnTile(mockGrid, mockGrid[1][0], anotherPlayer);

    //     service.teleportPlayer(mockGrid, mockPlayer, mockGrid[1][0]);
    //     expect(mockGrid[0][0].player).toBe(mockPlayer);
    //     expect(mockGrid[1][0].player).toBe(anotherPlayer);
    // });

    // it('should return an error when parsing an invalid tile ID', () => {
    //     const spyLogger = jest.spyOn(service['logger'], 'error');
    //     const result = service['parseTileCoordinates']('invalid-id');
    //     expect(result).toBeNull();
    //     expect(spyLogger).toHaveBeenCalledWith('Invalid tile ID format: invalid-id');
    // });
});
