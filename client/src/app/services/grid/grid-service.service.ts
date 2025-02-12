import { Injectable } from '@angular/core';
import { GRID_DIMENSIONS } from '@app/constants/global.constants';
import { GameSize } from '@app/enums/global.enums';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';

@Injectable({
    providedIn: 'root',
})
export class GridService {
    private grid: Tile[][] | undefined = [];

    createGrid(rows: number, cols: number): Tile[][] {
        return Array.from({ length: rows }, (_, rowIndex) =>
            Array.from(
                { length: cols },
                (i, colIndex): Tile => ({
                    id: `tile-${rowIndex}-${colIndex}`,
                    imageSrc: ImageType.Default,
                    isOccupied: false,
                    type: TileType.Default,
                    isOpen: true,
                }),
            ),
        );
    }

    setGrid(grid: Tile[][] | undefined): void {
        this.grid = grid;
    }

    getGrid() {
        return this.grid;
    }

    getTile(row: number, col: number) {
        return this.grid?.[row]?.[col];
    }

    getGridSize(gameSize: GameSize): number {
        return GRID_DIMENSIONS[gameSize as keyof typeof GRID_DIMENSIONS] || GRID_DIMENSIONS[GameSize.Small];
    }
}
