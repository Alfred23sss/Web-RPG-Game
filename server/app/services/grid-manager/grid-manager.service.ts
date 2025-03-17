import { Injectable, Logger } from '@nestjs/common';
import { Tile } from '@app/model/database/tile';
import { Player } from '@app/interfaces/Player';

const RANDOMIZER = 0.5;

@Injectable()
export class GridManagerService {
    constructor(private readonly logger: Logger) {}

    findTileById(grid: Tile[][], tileId: string): Tile | undefined {
        return grid.flat().find((tile) => tile.id === tileId);
    }

    findTileByPlayer(grid: Tile[][], player: Player): Tile | undefined {
        return grid.flat().find((tile) => tile.player?.name === player.name);
    }

    findTileBySpawnPoint(grid: Tile[][], player: Player): Tile | undefined {
        return grid.flat().find((tile) => tile.id === player.spawnPoint.tileId);
    }

    findAndCheckAdjacentTiles(tileId1: string, tileId2: string, grid: Tile[][]): boolean {
        let tile1Pos: { row: number; col: number } | null = null;
        let tile2Pos: { row: number; col: number } | null = null;

        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                if (grid[row][col].id === tileId1) {
                    tile1Pos = { row, col };
                }
                if (grid[row][col].id === tileId2) {
                    tile2Pos = { row, col };
                }
                if (tile1Pos && tile2Pos) break;
            }
            if (tile1Pos && tile2Pos) break;
        }

        if (!tile1Pos || !tile2Pos) return false;
        return Math.abs(tile1Pos.row - tile2Pos.row) + Math.abs(tile1Pos.col - tile2Pos.col) === 1;
    }

    clearPlayerFromGrid(grid: Tile[][], playerName: string): void {
        for (const row of grid) {
            for (const tile of row) {
                if (tile.player?.name === playerName) {
                    tile.player = undefined;
                }
            }
        }
    }

    setPlayerOnTile(grid: Tile[][], targetTile: Tile, player: Player): void {
        for (const row of grid) {
            for (const tile of row) {
                if (tile.id === targetTile.id) {
                    tile.player = player;
                    return;
                }
            }
        }
    }

    findSpawnPoints(grid: Tile[][]): Tile[] {
        return grid.flat().filter((tile) => tile.item?.name === 'home');
    }

    assignPlayersToSpawnPoints(players: Player[], spawnPoints: Tile[], grid: Tile[][]): Tile[][] {
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

        return grid;
    }

    teleportPlayer(grid: Tile[][], player: Player, targetTile: Tile): Tile[][] {
        const currentPlayerTile = this.findTileByPlayer(grid, player);
        if (!currentPlayerTile) {
            this.logger.warn(`Player ${player.name} not found on any tile.`);
            return grid;
        }
        if (currentPlayerTile === targetTile) {
            return grid;
        }

        let destinationTile = targetTile;
        const isPlayerSpawnPoint = player.spawnPoint.tileId === targetTile.id;

        if (targetTile.player || targetTile.type === 'mur' || (targetTile.type === 'porte' && !targetTile.isOpen)) {
            if (isPlayerSpawnPoint) {
                destinationTile = this.findClosestAvailableTile(grid, targetTile) || currentPlayerTile;
            } else {
                return grid;
            }
        }

        destinationTile.player = player;
        currentPlayerTile.player = undefined;

        return grid;
    }

    private findClosestAvailableTile(grid: Tile[][], startTile: Tile): Tile | undefined {
        const queue: Tile[] = [startTile];
        const visited = new Set<string>();
        visited.add(startTile.id);

        while (queue.length > 0) {
            const tile = queue.shift();
            if (!tile) continue;

            if (!tile.player && (!tile.type || tile.type !== 'mur') && (!tile.type || tile.type !== 'porte' || tile.isOpen)) {
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
            this.logger.error(`Invalid tile ID format: ${tileId}`);
            return null;
        }
        return {
            row: parseInt(match[1], 10),
            col: parseInt(match[2], 10),
        };
    }
}
