import { TileType } from '@app/enums/enums';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerMovementService {
    private movementCosts = new Map<TileType, number>([
        [TileType.Ice, 0],
        [TileType.Default, 1],
        [TileType.Water, 2],
        [TileType.Wall, Infinity],
        [TileType.Door, 1],
    ]);

    // not needed ??? also remove all unused functions here !!!!!
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
                if (this.isNeighborBlocked(neighbor, startTile.player)) continue;

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
            queue.sort((a, b) => a.cost - b.cost);
            const next = queue.shift();
            if (!next) break;
            const { tile: currentTile, cost: currentCost } = next;

            if (currentTile === targetTile) return this.reconstructPath(previous, targetTile);

            for (const neighbor of this.getNeighbors(currentTile, grid)) {
                if (!this.isValidNeighbor(neighbor)) continue; // possiblement pas inclure dn quickestpath la porte pcq

                const moveCost = this.getMoveCost(neighbor);
                if (moveCost === Infinity) continue;

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
        return adjacentTiles.some((tile) => tile.type === TileType.Door || tile.player !== undefined);
    }

    hasAdjacentPlayer(vPTile: Tile, grid: Tile[][]): boolean {
        const adjacentTiles = this.getNeighbors(vPTile, grid);
        return adjacentTiles.some((tile) => tile.player !== undefined);
    }

    // getAvailableActionTile(currentTile: Tile, grid: Tile[][]): Tile | undefined {
    //     const neighbors = this.getNeighbors(currentTile, grid);
    //     const playerTile = neighbors.find((neighbor) => neighbor.player !== undefined);
    //     if (playerTile) {
    //         return playerTile;
    //     }
    //     const doorTile = neighbors.find((neighbor) => neighbor.type === TileType.Door && !this.isNeighborBlocked(neighbor));
    //     return doorTile;
    // }

    // chek pr action possible durant son parcours,
    // chek si dn parcous ya item et gere si c'est le cas.
    // chek aussi pendant quil cherche le plus petit parcours de prendre en compte les portes et quil peut les ouvrir =>
    // (split move en 2 , premier move ensuite action(item aussi) si available ouvre porte et ensuite 2e move)

    findClosestReachableTile(moveTile: Tile, virtualPlayerTile: Tile, grid: Tile[][], movementPoints: number): Tile | undefined {
        const bestMoveTile = this.findBestMoveTile(moveTile, virtualPlayerTile, grid);
        if (!bestMoveTile) return undefined;

        return this.getFarthestReachableTile(virtualPlayerTile, bestMoveTile, grid, movementPoints);
    }

    getNeighbors(tile: Tile, grid: Tile[][]): Tile[] {
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

    // only for players since we are checking adjacent tiles.
    findBestMoveTile(moveTile: Tile, virtualPlayerTile: Tile, grid: Tile[][]): Tile | undefined {
        let bestMoveTile: Tile | undefined;
        let minCost = Infinity;

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

    private isNeighborBlocked(neighbor: Tile, player: Player): boolean {
        const isDoorClosed = neighbor.type === TileType.Door && !neighbor.isOpen;
        const canOpenDoor = isDoorClosed && player.actionPoints > 0;
        return neighbor.type === TileType.Wall || !canOpenDoor || neighbor.player !== undefined;
    }

    private canMoveToTile(newRemaining: number, neighborRemaining: number): boolean {
        return newRemaining >= 0 && newRemaining > neighborRemaining;
    }

    // private isValidNeighbor(neighbor: Tile, player: Player): boolean {
    //     const isDoorClosed = neighbor.type === TileType.Door && !neighbor.isOpen;
    //     const canOpenDoor = isDoorClosed && player.actionPoints > 0;
    //     if (neighbor.type === TileType.Wall) return false;
    //     if (!canOpenDoor) return false;
    //     if (neighbor.player !== undefined) return false;
    //     return this.movementCosts.has(neighbor.type);
    // }
    private isValidNeighbor(neighbor: Tile): boolean {
        if ((neighbor.type === TileType.Door && !neighbor.isOpen) || neighbor.player !== undefined) return false;
        return this.movementCosts.has(neighbor.type);
    }

    private isValidNeighborForVirtualPlayer(tile: Tile, virtualPlayer: Player): boolean {
        if (tile.type === TileType.Door && !tile.isOpen) return false;

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
