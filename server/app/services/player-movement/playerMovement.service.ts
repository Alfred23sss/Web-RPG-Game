import { DEFAULT_COST, DOOR_COST, ICE_COST, WALL_COST, WATER_COST } from '@app/constants/constants';
import { ItemName, TileType } from '@app/enums/enums';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerMovementService {
    private movementCosts = new Map<TileType, number>([
        [TileType.Ice, ICE_COST],
        [TileType.Default, DEFAULT_COST],
        [TileType.Water, WATER_COST],
        [TileType.Wall, WALL_COST],
        [TileType.Door, DOOR_COST],
    ]);

    quickestPath(startTile: Tile | undefined, targetTile: Tile | undefined, grid: Tile[][]): Tile[] | undefined {
        if (!startTile || !targetTile || targetTile.type === TileType.Wall || !grid) return undefined;

        const queue: { tile: Tile; cost: number }[] = [{ tile: startTile, cost: 0 }];
        const costs = new Map<Tile, number>();
        const previous = new Map<Tile, Tile | null>();

        costs.set(startTile, 0);
        previous.set(startTile, null);

        while (queue.length > 0) {
            queue.sort((a, b) => a.cost - b.cost);
            const next = queue.shift();
            if (!next) break;
            const { tile: currentTile, cost: currentCost } = next;

            if (currentTile === targetTile) {
                const fullPath = this.reconstructPath(previous, targetTile);
                return fullPath;
            }
            for (const neighbor of this.getNeighbors(currentTile, grid)) {
                if (!this.isValidNeighbor(neighbor)) continue;

                const moveCost = this.getMoveCost(neighbor);

                const newCost = currentCost + moveCost;
                if (!costs.has(neighbor) || newCost < this.getMoveCost(neighbor)) {
                    costs.set(neighbor, newCost);
                    previous.set(neighbor, currentTile);
                    queue.push(this.getNeighborAndCost(neighbor, newCost));
                }
            }
        }

        return undefined;
    }

    getMoveCost(neighbor: Tile): number {
        return this.movementCosts.get(neighbor.type) ?? WALL_COST;
    }

    hasAdjacentTileType(clientPlayerTile: Tile, grid: Tile[][], tileType: TileType): boolean {
        return this.getNeighbors(clientPlayerTile, grid).some((tile) => tile.type === tileType);
    }

    hasAdjacentPlayerOrDoor(clientPlayerTile: Tile, grid: Tile[][]): boolean {
        const adjacentTiles = this.getNeighbors(clientPlayerTile, grid);
        return adjacentTiles.some((tile) => tile.type === TileType.Door || tile.player !== undefined);
    }

    hasAdjacentPlayer(vPTile: Tile, grid: Tile[][]): boolean {
        const adjacentTiles = this.getNeighbors(vPTile, grid);
        return adjacentTiles.some((tile) => tile.player !== undefined);
    }

    findClosestReachableTile(moveTile: Tile, virtualPlayerTile: Tile, grid: Tile[][], movementPoints: number): Tile | undefined {
        const bestMoveTile = this.findBestMoveTile(moveTile, virtualPlayerTile, grid);
        if (!bestMoveTile) return undefined;

        return this.getFarthestReachableTile(virtualPlayerTile, bestMoveTile, grid, movementPoints);
    }

    getNeighbors(tile: Tile, grid: Tile[][]): Tile[] {
        const neighbors: Tile[] = [];
        if (!tile) return;

        const match = tile.id.match(/^tile-(\d+)-(\d+)$/);
        if (!match) return neighbors;

        const x = parseInt(match[1], 10);
        const y = parseInt(match[2], 10);

        const directions = [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
        ];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && ny >= 0 && nx < grid.length && ny < grid[0].length && grid[nx][ny]) {
                neighbors.push(grid[nx][ny]);
            }
        }

        return neighbors;
    }

    findBestMoveTile(moveTile: Tile, virtualPlayerTile: Tile, grid: Tile[][]): Tile | undefined {
        let bestMoveTile: Tile | undefined;
        let minCost = WALL_COST;

        for (const adjacentTile of this.getNeighbors(moveTile, grid)) {
            if (this.isValidNeighborForVirtualPlayer(adjacentTile, virtualPlayerTile.player)) {
                const path = this.quickestPath(virtualPlayerTile, adjacentTile, grid);
                if (path) {
                    const cost = path.reduce((total, tile) => total + this.getMoveCost(tile), 0);
                    if (cost < minCost) {
                        minCost = cost;
                        bestMoveTile = adjacentTile;
                    }
                }
            }
        }

        return bestMoveTile;
    }

    trimPathAtObstacle(path: Tile[]): Tile[] {
        for (let i = 1; i < path.length; i++) {
            const tile = path[i];
            const isClosedDoor = tile.type === TileType.Door && !tile.isOpen;
            const hasItem = tile.item && tile.item.name !== ItemName.Home;

            if (isClosedDoor || hasItem) {
                return path.slice(0, i + 1);
            }
        }
        return path;
    }

    private getFarthestReachableTile(virtualPlayerTile: Tile, targetTile: Tile, grid: Tile[][], movementPoints: number): Tile | undefined {
        const path = this.quickestPath(virtualPlayerTile, targetTile, grid);
        if (!path || path.length === 0) return undefined;
        let movementCost = 0;
        let farthestReachableTile = virtualPlayerTile;

        for (let i = 1; i < path.length; i++) {
            const tile = path[i];
            const tileCost = this.getMoveCost(tile);
            if (movementCost + tileCost > movementPoints) {
                break;
            }
            movementCost += tileCost;
            farthestReachableTile = tile;
        }
        return farthestReachableTile;
    }

    private getNeighborAndCost(neighbor: Tile, points: number): { tile: Tile; cost: number } {
        return { tile: neighbor, cost: points };
    }

    private isValidNeighbor(neighbor: Tile): boolean {
        return neighbor.player === undefined && neighbor.type !== TileType.Wall;
    }

    private isValidNeighborForVirtualPlayer(tile: Tile, virtualPlayer: Player): boolean {
        if (tile.type === TileType.Wall) return false;

        if (tile.player !== undefined && tile.player.name !== virtualPlayer.name) return false;

        return this.movementCosts.has(tile.type);
    }
    private reconstructPath(previous: Map<Tile, Tile | null>, target: Tile | null): Tile[] {
        const path: Tile[] = [];
        let current: Tile | null = target;
        while (current) {
            path.unshift(current);
            current = previous.get(current) || null;
        }
        return path;
    }
}
