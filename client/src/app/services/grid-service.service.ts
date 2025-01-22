import { Injectable } from '@angular/core';
import { Tile, TileType } from '@app/interfaces/tile';

@Injectable({
    providedIn: 'root',
})
export class GridService {
    private grid: Tile[][] = [];

    initializeGrid(rows: number, cols: number): void {
        this.grid = Array.from({ length: rows }, (_, rowIndex) =>
            Array.from(
                { length: cols },
                (_, colIndex): Tile => ({
                    id: `tile-${rowIndex}-${colIndex}`,
                    imageSrc: 'assets/images/clay.png',
                    isOccupied: false,
                    type: TileType.Default,
                    isOpen: true,
                }),
            ),
        );
    }

    getGrid(): Tile[][] {
        return this.grid;
    }

    getTile(row: number, col: number): Tile {
        return this.grid[row][col];
    }

    updateTile(row: number, col: number, newTile: Partial<Tile>): void {
        const tile = this.grid[row]?.[col];
        if (tile) {
            Object.assign(tile, newTile);
        }
    }
}
