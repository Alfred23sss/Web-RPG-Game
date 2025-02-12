import { Injectable } from '@angular/core';
import { GRID_DIMENSIONS } from '@app/constants/global.constants';
import { GameSize, TileType } from '@app/enums/global.enums';
import { ImageType } from '@app/interfaces/images';
import { Tile } from '@app/interfaces/tile';

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

    getGrid(): Tile[][] | undefined {
        return this.grid;
    }

    getGridSize(gameSize: GameSize): number {
        return GRID_DIMENSIONS[gameSize as keyof typeof GRID_DIMENSIONS] || GRID_DIMENSIONS[GameSize.Small];
    }
}
