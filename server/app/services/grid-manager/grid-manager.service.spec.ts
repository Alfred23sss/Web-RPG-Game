/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-empty-function */ // needed to access actual function
/* eslint-disable @typescript-eslint/no-explicit-any */ // needed to access private service
import { EventEmit } from '@app/enums/enums';
import { Item } from '@app/interfaces/item';
import { Player } from '@app/interfaces/player';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { Tile, TileType } from '@app/model/database/tile';
import { ImageType, ItemName } from '@common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from 'eventemitter2';
import { GridManagerService } from './grid-manager.service';

describe('GridManagerService', () => {
    let service: GridManagerService;
    let mockGrid: Tile[][];
    let mockPlayer: Player;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GridManagerService, EventEmitter2],
        }).compile();

        service = module.get<GridManagerService>(GridManagerService);

        mockGrid = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: null } as Tile,
                { id: 'tile-0-1', type: TileType.Default, isOpen: true, player: null } as Tile,
                { id: 'tile-0-2', type: TileType.Default, isOpen: true, player: null, item: { name: ItemName.QuestionMark } as Item } as Tile,
            ],
            [
                { id: 'tile-1-0', type: TileType.Default, isOpen: true, player: null } as Tile,
                { id: 'tile-1-1', type: TileType.Wall, isOpen: false, player: null } as Tile,
                { id: 'tile-1-2', type: TileType.Wall, isOpen: false, player: null, item: { name: ItemName.Fire } as Item } as Tile,
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

    it('should handle undefined tile in queue by continuing', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: undefined } as Tile,
                { id: 'tile-0-1', type: TileType.Default, isOpen: true, player: undefined } as Tile,
            ],
        ];
        const startTile = grid[0][0];

        const originalShift = Array.prototype.shift;
        let callCount = 0;
        Array.prototype.shift = function () {
            callCount++;
            if (callCount === 1) {
                return undefined;
            }
            return originalShift.apply(this, arguments);
        };

        try {
            const result = (service as any).findClosestAvailableTile(grid, startTile);
            expect(result).toBe(grid[0][0]);
        } finally {
            Array.prototype.shift = originalShift;
        }
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
    });

    it('should return empty array for invalid tile ID', () => {
        const invalidTile = { id: 'invalid-tile' } as Tile;
        const adjacentTiles = (service as any).getAdjacentTiles(mockGrid, invalidTile);
        expect(adjacentTiles).toEqual([]);
    });
    it('should not teleport if targetTile is occupied by another player', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: mockPlayer } as Tile,
                { id: 'tile-0-1', type: TileType.Default, isOpen: true, player: { name: 'Player2' } as Player } as Tile,
            ],
        ];

        const result = service.teleportPlayer(grid, mockPlayer, grid[0][1]);
        expect(result).toBe(grid);
        expect(grid[0][0].player).toBe(mockPlayer);
    });

    it('should not teleport if targetTile is a wall', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: mockPlayer } as Tile,
                { id: 'tile-0-1', type: TileType.Wall, isOpen: false, player: null } as Tile,
            ],
        ];

        const result = service.teleportPlayer(grid, mockPlayer, grid[0][1]);
        expect(result).toBe(grid);
        expect(grid[0][0].player).toBe(mockPlayer);
    });

    it('should not teleport if targetTile is a closed door', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: mockPlayer } as Tile,
                { id: 'tile-0-1', type: TileType.Door, isOpen: false, player: null } as Tile,
            ],
        ];

        const result = service.teleportPlayer(grid, mockPlayer, grid[0][1]);
        expect(result).toBe(grid);
        expect(grid[0][0].player).toBe(mockPlayer);
    });

    it('should not teleport if targetTile has an item that is not a home', () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: mockPlayer } as Tile,
                { id: 'tile-0-1', type: TileType.Default, isOpen: true, player: null, item: { name: 'key' } as Item } as Tile,
            ],
        ];

        const result = service.teleportPlayer(grid, mockPlayer, grid[0][1]);
        expect(result).toBe(grid);
        expect(grid[0][0].player).toBe(mockPlayer);
    });

    it("should teleport to closest available tile if targetTile is the player's spawn point and is obstructed", () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: mockPlayer } as Tile,
                { id: 'tile-0-1', type: TileType.Wall, isOpen: false, player: null, item: { name: 'home' } as Item } as Tile,
                { id: 'tile-0-2', type: TileType.Default, isOpen: true, player: null } as Tile,
            ],
        ];

        mockPlayer.spawnPoint.tileId = 'tile-0-1';

        const result = service.teleportPlayer(grid, mockPlayer, grid[0][1]);
        expect(result).toBe(grid);
        expect(grid[0][0].player).toBeUndefined();
        expect(grid[0][2].player).toBe(mockPlayer);
    });

    it("should not teleport if targetTile is not the player's spawn point and is obstructed", () => {
        const grid: Tile[][] = [
            [
                { id: 'tile-0-0', type: TileType.Default, isOpen: true, player: mockPlayer } as Tile,
                { id: 'tile-0-1', type: TileType.Wall, isOpen: false, player: null } as Tile,
            ],
        ];

        const result = service.teleportPlayer(grid, mockPlayer, grid[0][1]);
        expect(result).toBe(grid);
        expect(grid[0][0].player).toBe(mockPlayer);
    });

    describe('assignItemsToRandomItems', () => {
        it('should ignore QuestionMark and Home items when collecting existing items', () => {
            const grid: Tile[][] = [
                [
                    { id: 'tile-0-0', item: { name: ItemName.QuestionMark } } as Tile,
                    { id: 'tile-0-1', item: { name: ItemName.Home } } as Tile,
                    { id: 'tile-0-2', item: { name: ItemName.Fire } } as Tile,
                ],
            ];

            const result = service.assignItemsToRandomItems(grid);

            expect(result[0][0].item?.name).not.toBe(ItemName.QuestionMark);
            expect(result[0][1].item?.name).toBe(ItemName.Home);
        });

        it('should not modify tiles without items', () => {
            const grid: Tile[][] = [[{ id: 'tile-0-0', item: null } as Tile, { id: 'tile-0-1', item: { name: ItemName.QuestionMark } } as Tile]];

            const result = service.assignItemsToRandomItems(grid);

            expect(result[0][0].item).toBeNull();
            expect(result[0][1].item?.name).not.toBe(ItemName.QuestionMark);
        });
    });
    describe('updateWallTile', () => {
        const mockAccessCode = 'test-access-code';
        let spyOnFindAndCheckAdjacentTiles: jest.SpyInstance;
        let mockEventEmitter: EventEmitter2;

        beforeEach(() => {
            spyOnFindAndCheckAdjacentTiles = jest.spyOn(service, 'findAndCheckAdjacentTiles');
            mockEventEmitter = (service as any).eventEmitter;
            jest.spyOn(mockEventEmitter, 'emit');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should update a wall tile to default and reduce player action points when valid', () => {
            const previousTile = mockGrid[0][0];
            const newTile = mockGrid[1][1];
            newTile.type = TileType.Wall;
            newTile.imageSrc = ImageType.Wall;
            mockPlayer.actionPoints = 3;

            spyOnFindAndCheckAdjacentTiles.mockReturnValue(true);

            const [updatedGrid, updatedPlayer] = service.updateWallTile(mockGrid, mockAccessCode, previousTile, newTile, mockPlayer);

            expect(spyOnFindAndCheckAdjacentTiles).toHaveBeenCalledWith(previousTile.id, newTile.id, mockGrid);
            expect(updatedGrid[1][1].type).toBe(TileType.Default);
            expect(updatedGrid[1][1].imageSrc).toBe(ImageType.Default);
            expect(updatedPlayer.actionPoints).toBe(2);
            expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(EventEmit.PlayerUpdate, {
                accessCode: mockAccessCode,
                player: updatedPlayer,
            });
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(EventEmit.GameWallUpdate, {
                accessCode: mockAccessCode,
                grid: updatedGrid,
            });
        });

        it('should not update tile if tiles are not adjacent', () => {
            const previousTile = mockGrid[0][0];
            const newTile = mockGrid[1][1];
            mockPlayer.actionPoints = 3;

            spyOnFindAndCheckAdjacentTiles.mockReturnValue(false);

            const [updatedGrid, updatedPlayer] = service.updateWallTile(mockGrid, mockAccessCode, previousTile, newTile, mockPlayer);

            expect(spyOnFindAndCheckAdjacentTiles).toHaveBeenCalledWith(previousTile.id, newTile.id, mockGrid);
            expect(updatedGrid).toBe(mockGrid);
            expect(updatedPlayer).toBe(mockPlayer);
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should not update if target tile not found', () => {
            const previousTile = mockGrid[0][0];
            const newTile = { id: 'non-existent-tile' } as Tile;
            mockPlayer.actionPoints = 3;

            spyOnFindAndCheckAdjacentTiles.mockReturnValue(true);

            const [updatedGrid, updatedPlayer] = service.updateWallTile(mockGrid, mockAccessCode, previousTile, newTile, mockPlayer);

            expect(updatedGrid).toBe(mockGrid);
            expect(updatedPlayer).toBe(mockPlayer);
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });
    });
    describe('isFlagOnSpawnPoint', () => {
        let findTileByPlayerSpy: jest.SpyInstance;
        let findTileBySpawnPointSpy: jest.SpyInstance;
        const flagItem = { name: ItemName.Flag } as Item;
        const emptyItem = { name: undefined } as Item;

        beforeEach(() => {
            findTileByPlayerSpy = jest.spyOn(service, 'findTileByPlayer');
            findTileBySpawnPointSpy = jest.spyOn(service, 'findTileBySpawnPoint');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should return true when player with flag is on spawn point', () => {
            const playerTile = { id: 'tile-0-0' } as Tile;
            const playerWithFlag = {
                ...mockPlayer,
                inventory: [flagItem, emptyItem] as [Item, Item],
            };

            findTileByPlayerSpy.mockReturnValue(playerTile);
            findTileBySpawnPointSpy.mockReturnValue(playerTile);

            const result = service.isFlagOnSpawnPoint(mockGrid, playerWithFlag);

            expect(findTileByPlayerSpy).toHaveBeenCalledWith(mockGrid, playerWithFlag);
            expect(findTileBySpawnPointSpy).toHaveBeenCalledWith(mockGrid, playerWithFlag);
            expect(result).toBe(true);
        });

        it('should return false when player without flag is on spawn point', () => {
            const playerTile = { id: 'tile-0-0' } as Tile;
            const keyItem = { name: ItemName.Default } as Item;
            const playerWithoutFlag = {
                ...mockPlayer,
                inventory: [keyItem, emptyItem] as [Item, Item],
            };

            findTileByPlayerSpy.mockReturnValue(playerTile);
            findTileBySpawnPointSpy.mockReturnValue(playerTile);

            const result = service.isFlagOnSpawnPoint(mockGrid, playerWithoutFlag);

            expect(result).toBe(false);
        });

        it('should return false when player with flag is not on spawn point', () => {
            const playerTile = { id: 'tile-0-1' } as Tile;
            const spawnPointTile = { id: 'tile-0-0' } as Tile;
            const playerWithFlag = {
                ...mockPlayer,
                inventory: [flagItem, emptyItem] as [Item, Item],
            };

            findTileByPlayerSpy.mockReturnValue(playerTile);
            findTileBySpawnPointSpy.mockReturnValue(spawnPointTile);

            const result = service.isFlagOnSpawnPoint(mockGrid, playerWithFlag);

            expect(result).toBe(false);
        });

        it('should return false when player tile is not found', () => {
            const spawnPointTile = { id: 'tile-0-0' } as Tile;
            const playerWithFlag = {
                ...mockPlayer,
                inventory: [flagItem, emptyItem] as [Item, Item],
            };

            findTileByPlayerSpy.mockReturnValue(null);
            findTileBySpawnPointSpy.mockReturnValue(spawnPointTile);

            const result = service.isFlagOnSpawnPoint(mockGrid, playerWithFlag);

            expect(result).toBe(false);
        });

        it('should return false when spawn point tile is not found', () => {
            const playerTile = { id: 'tile-0-0' } as Tile;
            const playerWithFlag = {
                ...mockPlayer,
                inventory: [flagItem, emptyItem] as [Item, Item],
            };

            findTileByPlayerSpy.mockReturnValue(playerTile);
            findTileBySpawnPointSpy.mockReturnValue(null);

            const result = service.isFlagOnSpawnPoint(mockGrid, playerWithFlag);
            expect(result).toBe(false);
        });

        it('should return false when player has no flag in inventory', () => {
            const playerTile = { id: 'tile-0-0' } as Tile;
            const playerWithNoFlag = {
                ...mockPlayer,
                inventory: [emptyItem, emptyItem] as [Item, Item],
            };

            findTileByPlayerSpy.mockReturnValue(playerTile);
            findTileBySpawnPointSpy.mockReturnValue(playerTile);
            const result = service.isFlagOnSpawnPoint(mockGrid, playerWithNoFlag);
            expect(result).toBe(false);
        });

        it('should return false when player has undefined inventory', () => {
            const playerTile = { id: 'tile-0-0' } as Tile;
            const playerWithUndefinedInventory = {
                ...mockPlayer,
                inventory: undefined as unknown as [Item, Item],
            };

            findTileByPlayerSpy.mockReturnValue(playerTile);
            findTileBySpawnPointSpy.mockReturnValue(playerTile);
            const result = service.isFlagOnSpawnPoint(mockGrid, playerWithUndefinedInventory);
            expect(result).toBe(false);
        });
        it('should handle different item conditions in inventory when checking for flag', () => {
            const playerTile = { id: 'tile-0-0' } as Tile;

            findTileByPlayerSpy.mockReturnValue(playerTile);
            findTileBySpawnPointSpy.mockReturnValue(playerTile);

            const playerWithNullItem = {
                ...mockPlayer,
                inventory: [null as unknown as Item, emptyItem] as [Item, Item],
            };
            const resultWithNullItem = service.isFlagOnSpawnPoint(mockGrid, playerWithNullItem);
            expect(resultWithNullItem).toBe(false);

            const playerWithUndefinedItem = {
                ...mockPlayer,
                inventory: [undefined as unknown as Item, emptyItem] as [Item, Item],
            };
            const resultWithUndefinedItem = service.isFlagOnSpawnPoint(mockGrid, playerWithUndefinedItem);
            expect(resultWithUndefinedItem).toBe(false);

            const noNameItem = {} as Item;
            const playerWithNoNameItem = {
                ...mockPlayer,
                inventory: [noNameItem, emptyItem] as [Item, Item],
            };
            const resultWithNoNameItem = service.isFlagOnSpawnPoint(mockGrid, playerWithNoNameItem);
            expect(resultWithNoNameItem).toBe(false);

            const differentNameItem = { name: ItemName.Swap } as Item;
            const playerWithDifferentNameItem = {
                ...mockPlayer,
                inventory: [differentNameItem, emptyItem] as [Item, Item],
            };
            const resultWithDifferentNameItem = service.isFlagOnSpawnPoint(mockGrid, playerWithDifferentNameItem);
            expect(resultWithDifferentNameItem).toBe(false);
            const playerWithFlagItem = {
                ...mockPlayer,
                inventory: [flagItem, emptyItem] as [Item, Item],
            };
            const resultWithFlagItem = service.isFlagOnSpawnPoint(mockGrid, playerWithFlagItem);
            expect(resultWithFlagItem).toBe(true);
        });
    });
    describe('updateDoorTile', () => {
        const mockAccessCode = 'test-access-code';
        let mockEventEmitter: EventEmitter2;

        beforeEach(() => {
            mockEventEmitter = (service as any).eventEmitter;
            jest.spyOn(mockEventEmitter, 'emit');
            jest.spyOn(service, 'findAndCheckAdjacentTiles');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should return original grid when target tile is not found', () => {
            const previousTile = mockGrid[0][0];
            const nonExistentTile = { id: 'non-existent-tile-id' } as Tile;
            (service.findAndCheckAdjacentTiles as jest.Mock).mockReturnValue(true);
            const mockPlayerVirtual = mockPlayer as VirtualPlayer;
            const result = service.updateDoorTile(mockGrid, mockAccessCode, previousTile, nonExistentTile, mockPlayerVirtual);
            expect(service.findAndCheckAdjacentTiles).toHaveBeenCalledWith(previousTile.id, nonExistentTile.id, mockGrid);

            expect(result).toBe(mockGrid);
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });
    });
    describe('findTileBySpawnPoint', () => {
        it('should handle undefined spawnPoint property', () => {
            const playerWithoutSpawnPoint = {
                ...mockPlayer,
                spawnPoint: undefined,
            };

            const result = service.findTileBySpawnPoint(mockGrid, playerWithoutSpawnPoint);

            expect(result).toBeUndefined();
        });

        it('should handle null spawnPoint property', () => {
            const playerWithNullSpawnPoint = {
                ...mockPlayer,
                spawnPoint: null as any,
            };

            const result = service.findTileBySpawnPoint(mockGrid, playerWithNullSpawnPoint);

            expect(result).toBeUndefined();
        });

        it('should handle spawnPoint with undefined tileId', () => {
            const playerWithUndefinedTileId = {
                ...mockPlayer,
                spawnPoint: { x: 0, y: 0, tileId: undefined as any },
            };

            const result = service.findTileBySpawnPoint(mockGrid, playerWithUndefinedTileId);

            expect(result).toBeUndefined();
        });

        it('should handle spawnPoint with non-existent tileId', () => {
            const playerWithNonExistentTileId = {
                ...mockPlayer,
                spawnPoint: { x: 0, y: 0, tileId: 'non-existent-tile-id' },
            };

            const result = service.findTileBySpawnPoint(mockGrid, playerWithNonExistentTileId);
            expect(result).toBeUndefined();
        });
    });
    describe('countDoors', () => {
        it('should return 0 if there are no doors in the grid', () => {
            const result = service.countDoors(mockGrid);
            expect(result).toBe(0);
        });

        it('should count the correct number of doors in the grid', () => {
            mockGrid[0][1].type = TileType.Door;
            mockGrid[1][2].type = TileType.Door;

            const result = service.countDoors(mockGrid);
            expect(result).toBe(2);
        });

        it('should return total number of tiles if all are doors', () => {
            mockGrid = mockGrid.map((row) => row.map((tile) => ({ ...tile, type: TileType.Door })));

            const result = service.countDoors(mockGrid);
            expect(result).toBe(mockGrid.length * mockGrid[0].length);
        });
    });

    describe('updateDoorTile (tile found and adjacent)', () => {
        it('should toggle door state, update image, emit events, and return grid', () => {
            const previousTile = { id: 'tile-0-0' } as Tile;
            const doorTile = {
                id: 'tile-0-1',
                type: TileType.Door,
                isOpen: true,
                imageSrc: ImageType.OpenDoor,
            } as Tile;

            mockGrid[0][1] = doorTile;

            jest.spyOn<any, any>(service, 'findAndCheckAdjacentTiles').mockReturnValue(true);
            const mockPlayerVirtual = mockPlayer as VirtualPlayer;
            const result = service.updateDoorTile(mockGrid, 'abc123', previousTile, doorTile, mockPlayerVirtual);

            expect(doorTile.imageSrc).toBe(ImageType.ClosedDoor);
            expect(doorTile.isOpen).toBe(false);
            expect(result).toBe(mockGrid);
        });
    });
});
