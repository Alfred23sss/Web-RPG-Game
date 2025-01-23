import { Injectable } from '@angular/core';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';

@Injectable({
    providedIn: 'root',
})
export class GridService {
    private grid: Tile[][] = [];

    createGrid(rows: number, cols: number): Tile[][] {
        return Array.from({ length: rows }, (_, rowIndex) =>
            Array.from(
                { length: cols },
                // eslint-disable-next-line @typescript-eslint/no-shadow
                (_, colIndex): Tile => ({
                    id: `tile-${rowIndex}-${colIndex}`,
                    imageSrc: ImageType.Default,
                    isOccupied: false,
                    type: TileType.Default,
                    isOpen: true,
                }),
            ),
        );
    }

    setGrid(grid: Tile[][]): void {
        this.grid = grid;
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
