import { Injectable } from '@angular/core';
import { TileType } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';
import { GridService } from '@app/services/grid/grid-service.service';

@Injectable({
    providedIn: 'root',
})
export class PlayerMovementService {
    constructor(private gridService: GridService) {}

    private movementCosts = new Map<string, number>([
        ['ice', 0],
        ['base', 1],
        ['door-open', 1],
        ['water', 2],
        ['wall', Infinity],
        ['door-closed', Infinity],
    ]);

    availablePath(startTile: Tile | undefined, maxMovement: number): Tile[] | undefined {
        const grid = this.gridService.getGrid();

        if (!startTile || !grid) {
            return undefined;
        }
        const reachableTiles: Set<Tile> = new Set();
        const queue: { tile: Tile; remainingPoints: number }[] = [{ tile: startTile, remainingPoints: maxMovement }];
        const visited = new Map<Tile, number>();

        reachableTiles.add(startTile);

        while (queue.length > 0) {
            const { tile, remainingPoints } = queue.shift()!;

            for (const neighbor of this.getNeighbors(tile, grid)) {
                const moveCost = this.movementCosts.get(neighbor.type) ?? Infinity;
                if (moveCost === Infinity) continue; 
                if (neighbor.type === TileType.Door && !neighbor.isOpen) continue;

                const newRemainingPoints = remainingPoints - moveCost;
                if (newRemainingPoints >= 0 && (!visited.has(neighbor) || newRemainingPoints > visited.get(neighbor)!)) {
                    visited.set(neighbor, newRemainingPoints);
                    reachableTiles.add(neighbor);
                    queue.push({ tile: neighbor, remainingPoints: newRemainingPoints });
                }
            }
        }

        return Array.from(reachableTiles);
    }

    quickestPath(startTile: Tile | undefined, targetTile: Tile | undefined): Tile[] | undefined {
        const grid = this.gridService.getGrid();

        if (!startTile || !targetTile || this.movementCosts.get(targetTile.type) === Infinity || !grid) {
            return undefined;
        }

        const queue: { tile: Tile; cost: number }[] = [{ tile: startTile, cost: 0 }];
        const costs = new Map<Tile, number>();
        const previous = new Map<Tile, Tile | null>();

        costs.set(startTile, 0);
        previous.set(startTile, null);

        while (queue.length > 0) {
            queue.sort((a, b) => a.cost - b.cost);
            const { tile: currentTile, cost: currentCost } = queue.shift()!;

            if (currentTile === targetTile) {
                return this.reconstructPath(previous, targetTile);
            }

            for (const neighbor of this.getNeighbors(currentTile, grid)) {
                const moveCost = this.movementCosts.get(neighbor.type) ?? Infinity;
                if (moveCost === Infinity) continue;

                const newCost = currentCost + moveCost;
                if (!costs.has(neighbor) || newCost < costs.get(neighbor)!) {
                    costs.set(neighbor, newCost);
                    previous.set(neighbor, currentTile);
                    queue.push({ tile: neighbor, cost: newCost });
                }
            }
        }

        return undefined;
    }

    private getNeighbors(tile: Tile, grid: Tile[][]): Tile[] {
        const neighbors: Tile[] = [];
        const [x, y] = [0, 0]; // Changer Ceci pour avoir le bon x et y en le sortant du string voir si on créer un nouveau attribut ou sort du string

        const directions = [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
        ];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (grid[nx] && grid[nx][ny]) {
                neighbors.push(grid[nx][ny]);
            }
        }

        return neighbors;
    }

    private reconstructPath(previous: Map<Tile, Tile | null>, target: Tile): Tile[] {
        const path: Tile[] = [];
        let current: Tile | null = target;
        while (current) {
            path.unshift(current);
            current = previous.get(current) || null;
        }
        return path;
    }
}
