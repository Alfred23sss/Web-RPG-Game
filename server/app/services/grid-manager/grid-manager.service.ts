import { RANDOMIZER, RANDOM_ITEMS } from '@app/constants/constants';
import { EventEmit } from '@app/enums/enums';
import { Player } from '@app/interfaces/player';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { Tile, TileType } from '@app/model/database/tile';
import { ImageType, ItemName } from '@common/enums';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class GridManagerService {
    constructor(private readonly eventEmitter: EventEmitter2) {}

    findTileById(grid: Tile[][], tileId: string): Tile | undefined {
        return grid.flat().find((tile) => tile.id === tileId);
    }

    findTileByPlayer(grid: Tile[][], player: Player): Tile | undefined {
        return grid.flat().find((tile) => tile.player?.name === player.name);
    }

    findTileBySpawnPoint(grid: Tile[][], player: Player): Tile | undefined {
        return player.spawnPoint ? grid.flat().find((tile) => tile.id === player.spawnPoint.tileId) : undefined;
    }

    findAndCheckAdjacentTiles(tileId1: string, tileId2: string, grid: Tile[][]): boolean {
        const tile1Pos = this.findTilePosition(tileId1, grid);
        const tile2Pos = this.findTilePosition(tileId2, grid);

        if (!tile1Pos || !tile2Pos) return false;

        return this.areTilesAdjacent(tile1Pos, tile2Pos);
    }

    clearPlayerFromGrid(grid: Tile[][], playerName: string): void {
        for (const tile of grid.flat()) {
            if (tile.player?.name === playerName) {
                tile.player = undefined;
            }
        }
    }

    updateDoorTile(grid: Tile[][], accessCode: string, previousTile: Tile, newTile: Tile, player: VirtualPlayer): Tile[][] {
        const isAdjacent = this.findAndCheckAdjacentTiles(previousTile.id, newTile.id, grid);
        if (!isAdjacent) return grid;
        const targetTile = grid.flat().find((tile) => tile.id === newTile.id);
        if (!targetTile) return grid;
        if (targetTile.isOpen) {
            targetTile.imageSrc = ImageType.ClosedDoor;
        } else {
            targetTile.imageSrc = ImageType.OpenDoor;
        }
        targetTile.isOpen = !targetTile.isOpen;
        this.eventEmitter.emit(EventEmit.UpdateDoorStats, { accessCode, tile: previousTile });
        if (player.isVirtual) {
            this.eventEmitter.emit(EventEmit.GameDoorUpdate, { accessCode, grid, isOpen: !newTile.isOpen, player });
        } else {
            this.eventEmitter.emit(EventEmit.GameDoorUpdate, { accessCode, grid, isOpen: newTile.isOpen, player });
        }
        return grid;
    }

    updateWallTile(grid: Tile[][], accessCode: string, previousTile: Tile, newTile: Tile, player: Player): [Tile[][], Player] {
        const isAdjacent = this.findAndCheckAdjacentTiles(previousTile.id, newTile.id, grid);
        if (!isAdjacent) return [grid, player];
        const targetTile = grid.flat().find((tile) => tile.id === newTile.id);
        if (!targetTile) return [grid, player];
        targetTile.type = TileType.Default;
        targetTile.imageSrc = ImageType.Default;
        const updatedPlayer = { ...player, actionPoints: player.actionPoints - 1 };
        this.eventEmitter.emit(EventEmit.PlayerUpdate, {
            accessCode,
            player: updatedPlayer,
        });
        this.eventEmitter.emit(EventEmit.GameWallUpdate, {
            accessCode,
            grid,
        });
        return [grid, updatedPlayer];
    }

    setPlayerOnTile(grid: Tile[][], targetTile: Tile, player: Player): void {
        const tile = grid.flat().find((t) => t.id === targetTile.id);
        if (tile) {
            tile.player = player;
        }
    }

    countDoors(grid: Tile[][]): number {
        return grid.flat().filter((tile) => tile.type === TileType.Door).length;
    }

    findSpawnPoints(grid: Tile[][]): Tile[] {
        return grid.flat().filter((tile) => tile.item?.name === 'home');
    }

    assignPlayersToSpawnPoints(players: Player[], spawnPoints: Tile[], grid: Tile[][]): [Player[], Tile[][]] {
        const shuffledSpawns = [...spawnPoints].sort(() => Math.random() - RANDOMIZER);
        players.forEach((player, index) => {
            if (index < shuffledSpawns.length) {
                const spawnTile = shuffledSpawns[index];
                spawnTile.player = player;
                const coords = this.parseTileCoordinates(spawnTile.id);
                if (coords) {
                    player.spawnPoint = {
                        x: coords.row,
                        y: coords.col,
                        tileId: spawnTile.id,
                    };
                }
            }
        });

        shuffledSpawns.slice(players.length).forEach((spawnPoint) => {
            spawnPoint.item = null;
        });
        return [players, grid];
    }

    assignItemsToRandomItems(grid: Tile[][]): Tile[][] {
        const getExistingItems = (): Set<string> => {
            const items = grid.flatMap((row) =>
                row.map((tile) => tile.item?.name).filter((name) => name && name !== ItemName.Chest && name !== ItemName.Home),
            );
            return new Set(items);
        };

        const shuffleArray = <T>(array: T[]): T[] => {
            return [...array].sort(() => Math.random() - RANDOMIZER);
        };

        const existingItems = getExistingItems();
        let remainingItems = RANDOM_ITEMS.filter((item) => !existingItems.has(item.name));

        remainingItems = shuffleArray(remainingItems);

        grid.flat().forEach((tile) => {
            if (tile.item?.name === ItemName.Chest) {
                const randomItem = remainingItems.pop() ?? null;
                if (randomItem) {
                    tile.item = randomItem;
                }
            }
        });

        return grid;
    }

    teleportPlayer(grid: Tile[][], player: Player, targetTile: Tile): Tile[][] {
        const currentPlayerTile = this.findTileByPlayer(grid, player);
        if (!currentPlayerTile) {
            return grid;
        }
        if (currentPlayerTile === targetTile) {
            return grid;
        }
        let destinationTile = targetTile;
        const isPlayerSpawnPoint = player.spawnPoint.tileId === targetTile.id;
        if (
            targetTile.player ||
            targetTile.type === 'mur' ||
            (targetTile.type === 'porte' && !targetTile.isOpen) ||
            (targetTile.item && targetTile.item.name !== 'home')
        ) {
            if (isPlayerSpawnPoint) {
                destinationTile = this.findClosestAvailableTile(grid, targetTile);
                if (!destinationTile) {
                    return grid;
                }
            } else {
                return grid;
            }
        }

        currentPlayerTile.player = undefined;
        this.setPlayerOnTile(grid, destinationTile, player);
        return grid;
    }

    findClosestAvailableTile(grid: Tile[][], startTile: Tile): Tile | undefined {
        const queue: Tile[] = [startTile];
        const visited = new Set<string>();
        visited.add(startTile.id);
        while (queue.length > 0) {
            const tile = queue.shift();
            if (!tile) continue;

            if (!tile.player && (!tile.type || tile.type !== 'mur') && (!tile.type || tile.type !== 'porte' || tile.isOpen) && !tile.item) {
                return tile;
            }
            const neighbors = this.getAdjacentTiles(grid, tile);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    queue.push(neighbor);
                }
            }
        }
        return undefined;
    }

    isFlagOnSpawnPoint(grid: Tile[][], player: Player): boolean {
        const isAtSpawn = this.findTileByPlayer(grid, player)?.id === this.findTileBySpawnPoint(grid, player)?.id;

        return (isAtSpawn && player.inventory?.some((item) => item?.name === ItemName.Flag)) ?? false;
    }

    private getAdjacentTiles(grid: Tile[][], tile: Tile): Tile[] {
        const coords = this.parseTileCoordinates(tile.id);
        if (!coords) return [];
        const { row, col } = coords;
        const adjacentTiles: Tile[] = [];
        if (row > 0) adjacentTiles.push(grid[row - 1][col]);
        if (row < grid.length - 1) adjacentTiles.push(grid[row + 1][col]);
        if (col > 0) adjacentTiles.push(grid[row][col - 1]);
        if (col < grid[row].length - 1) adjacentTiles.push(grid[row][col + 1]);
        return adjacentTiles;
    }

    private parseTileCoordinates(tileId: string): { row: number; col: number } | null {
        const match = tileId.match(/tile-(\d+)-(\d+)/);
        if (!match) {
            return null;
        }
        return {
            row: parseInt(match[1], 10),
            col: parseInt(match[2], 10),
        };
    }

    private findTilePosition(tileId: string, grid: Tile[][]): { row: number; col: number } | null {
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                if (grid[row][col].id === tileId) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    private areTilesAdjacent(pos1: { row: number; col: number }, pos2: { row: number; col: number }): boolean {
        const rowDiff = Math.abs(pos1.row - pos2.row);
        const colDiff = Math.abs(pos1.col - pos2.col);
        return rowDiff + colDiff === 1;
    }
}
