import { Injectable } from '@angular/core';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { TileType } from '@common/enums';

@Injectable({
    providedIn: 'root',
})
export class PlayerMovementService {
    private movementCosts = new Map<TileType, number>([
        [TileType.Ice, 0],
        [TileType.Default, 1],
        [TileType.Water, 2],
        [TileType.Wall, Infinity],
        [TileType.Door, 1],
    ]);

    availablePath(startTile: Tile | undefined, maxMovement: number, grid: Tile[][]): Tile[] {
        if (!startTile || !grid || startTile.type === TileType.Wall || (startTile.type === TileType.Door && !startTile.isOpen)) return [];

        const reachableTiles = new Set<Tile>();
        const queue: { tile: Tile; cost: number }[] = [{ tile: startTile, cost: maxMovement }];
        const visited = new Map<Tile, number>();

        reachableTiles.add(startTile);
        visited.set(startTile, maxMovement);

        while (queue.length) {
            const dequeued = queue.shift();
            if (!dequeued) continue;
            const { tile, cost: remainingPoints } = dequeued;

            for (const neighbor of this.getNeighbors(tile, grid)) {
                if (this.isNeighborBlocked(neighbor)) continue;

                const moveCost = this.getMoveCost(neighbor);
                const newRemainingPoints = remainingPoints - moveCost;
                const neighborRemainingPoints = visited.get(neighbor) ?? -Infinity;
                if (this.canMoveToTile(newRemainingPoints, neighborRemainingPoints)) {
                    visited.set(neighbor, newRemainingPoints);
                    reachableTiles.add(neighbor);
                    queue.push(this.getNeighborAndCost(neighbor, newRemainingPoints));
                }
            }
        }
        return Array.from(reachableTiles);
    }

    quickestPath(startTile: Tile | undefined, targetTile: Tile | undefined, grid: Tile[][]): Tile[] | undefined {
        if (!startTile || !targetTile || targetTile.type === TileType.Wall || !grid) return undefined;

        const queue: { tile: Tile; cost: number }[] = [{ tile: startTile, cost: 0 }];
        const costs = new Map<Tile, number>();
        const previous = new Map<Tile, Tile | null>();

        costs.set(startTile, 0);
        previous.set(startTile, null);

        while (queue.length > 0) {
            this.sortQueueByCost(queue);
            const next = queue.shift();
            if (!next) break;

            const { tile: currentTile, cost: currentCost } = next;

            if (currentTile === targetTile) return this.reconstructPath(previous, targetTile);

            this.processNeighbors({ currentTile, currentCost, grid }, { queue, costs, previous });
        }

        return undefined;
    }

    calculateRemainingMovementPoints(tile: Tile | undefined, player: Player): number {
        if (tile) {
            return this.getMoveCost(tile);
        }
        return player.movementPoints;
    }

    getMoveCost(neighbor: Tile): number {
        return this.movementCosts.get(neighbor.type) ?? Infinity;
    }
    hasAdjacentTileType(clientPlayerTile: Tile, grid: Tile[][], tileType: TileType): boolean {
        return this.getNeighbors(clientPlayerTile, grid).some((tile) => tile.type === tileType);
    }
    hasAdjacentPlayerOrDoor(clientPlayerTile: Tile, grid: Tile[][]): boolean {
        const adjacentTiles = this.getNeighbors(clientPlayerTile, grid);
        // faut recheck ça, quand j'enlève ca met une erreur de tests, mais on a perdu des points
        return adjacentTiles.some((tile) => (tile.type === TileType.Door && !tile.isOpen) || tile.player !== undefined);
    }

    private sortQueueByCost(queue: { tile: Tile; cost: number }[]): void {
        queue.sort((a, b) => a.cost - b.cost);
    }

    private processNeighbors(
        context: { currentTile: Tile; currentCost: number; grid: Tile[][] },
        state: {
            queue: { tile: Tile; cost: number }[];
            costs: Map<Tile, number>;
            previous: Map<Tile, Tile | null>;
        },
    ): void {
        const { currentTile, currentCost, grid } = context;
        const { queue, costs, previous } = state;

        for (const neighbor of this.getValidNeighbors(currentTile, grid)) {
            const moveCost = this.getMoveCost(neighbor);
            const newCost = currentCost + moveCost;

            if (!costs.has(neighbor) || newCost < (costs.get(neighbor) ?? Infinity)) {
                costs.set(neighbor, newCost);
                previous.set(neighbor, currentTile);
                queue.push(this.getNeighborAndCost(neighbor, newCost));
            }
        }
    }

    private getValidNeighbors(tile: Tile, grid: Tile[][]): Tile[] {
        return this.getNeighbors(tile, grid).filter((neighbor) => this.isValidNeighbor(neighbor));
    }

    private getNeighborAndCost(neighbor: Tile, points: number): { tile: Tile; cost: number } {
        return { tile: neighbor, cost: points };
    }

    private isNeighborBlocked(neighbor: Tile): boolean {
        return neighbor.type === TileType.Wall || (neighbor.type === TileType.Door && !neighbor.isOpen);
    }

    private canMoveToTile(newRemaining: number, neighborRemaining: number): boolean {
        return newRemaining >= 0 && newRemaining > neighborRemaining;
    }

    private isValidNeighbor(neighbor: Tile): boolean {
        if ((neighbor.type === TileType.Door && !neighbor.isOpen) || neighbor.player !== undefined) return false;
        return this.movementCosts.has(neighbor.type);
    }

    private getNeighbors(tile: Tile, grid: Tile[][]): Tile[] {
        const neighbors: Tile[] = [];

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
