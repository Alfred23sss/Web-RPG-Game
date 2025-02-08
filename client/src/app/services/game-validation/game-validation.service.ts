import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Game, GameMode } from '@app/interfaces/game';
import { TileType } from '@app/interfaces/tile';
import { GameService } from '@app/services/game/game.service';

enum TitleLength {
    Min = 0,
    Max = 30,
}
enum DescriptionLength {
    Min = 0,
    Max = 100,
}
enum GameSize {
    Small = '10',
    Medium = '15',
    Large = '20',
    SmallItemCount = 2,
    MediumItemCount = 2,
    LargeItemCount = 2,
}
enum ItemCount {
    Small = 8,
    Medium = 10,
    Large = 12,
}

@Injectable({
    providedIn: 'root',
})
export class GameValidationService {
    constructor(
        private gameService: GameService,
        private snackBar: MatSnackBar,
    ) {}

    validateGame(game: Game): boolean {
        const errors: string[] = [];
        errors.push(...this.validateDoorPosition(game));
        errors.push(...this.validateHalfTerrain(game));
        errors.push(...this.validateTitleAndDescription(game.name, game.description));
        errors.push(...this.validateAllTerrainAccessible(game));
        errors.push(...this.validateItems(game));

        if (errors.length > 0) {
            this.showError(errors.join('\n'));
            return false;
        }
        return true;
    }

    private validateDoorPosition(game: Game): string[] {
        const errors: string[] = [];
        if (!game.grid) {
            errors.push('❌ No grid found');
            return errors;
        }
        const numRows = game.grid.length;
        const numCols = game.grid[0].length;
        let doorErrorFound = false;
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                const tile = game.grid[i][j];
                if (tile.type === TileType.Door) {
                    if (i === 0 || j === 0 || i === numRows - 1 || j === numCols - 1) {
                        doorErrorFound = true;
                    }
                    const hasWallOnSameAxis = this.hasWallsOnSameAxis(game, i, j);
                    const hasTerrainOnOtherAxis = this.hasTerrainOnOtherAxis(game, i, j);
                    if (!hasWallOnSameAxis || !hasTerrainOnOtherAxis) {
                        doorErrorFound = true;
                    }
                }
            }
        }
        if (doorErrorFound) {
            errors.push('❌ One or more doors are not correctly placed.');
        }
        return errors;
    }

    private validateHalfTerrain(game: Game): string[] {
        const errors: string[] = [];
        if (!game.grid) {
            errors.push('❌ No grid found');
            return errors;
        }
        const terrainProportionMin = 0.5;
        const gridSize = Math.pow(Number(game.size), 2);
        let terrainTileCount = 0;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.type !== TileType.Wall && tile.type !== TileType.Door) {
                    terrainTileCount++;
                }
            }
        }
        if (terrainTileCount / gridSize <= terrainProportionMin) {
            errors.push('❌ Grid must be more than 50% terrain (Default, Ice or Water)');
        }
        return errors;
    }

    private validateTitleAndDescription(title: string, description: string): string[] {
        const errors: string[] = [];
        if (!this.isTitleValid(title)) {
            errors.push('❌ Name must be between 1 and 30 characters and unique.');
        }
        if (!this.isDescriptionValid(description)) {
            errors.push('❌ Description must not be empty and must be at most 100 characters.');
        }
        return errors;
    }

    private validateItems(game: Game): string[] {
        const errors: string[] = [];
        const flagError = this.validateFlagPlaced(game);
        if (flagError) errors.push(flagError);
        const homeError = this.validateHomeItemsPlaced(game);
        if (homeError) errors.push(homeError);
        const itemCountError = this.validateItemCount(game);
        if (itemCountError) errors.push(itemCountError);
        return errors;
    }

    private validateFlagPlaced(game: Game): string | null {
        if (!game.grid) return '❌ No grid found';
        if (game.mode !== GameMode.CTF) return null;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item?.name === 'flag') {
                    return null;
                }
            }
        }
        return '❌ Flag must be placed on the map.';
    }

    private validateHomeItemsPlaced(game: Game): string | null {
        if (!game.grid) return '❌ No grid found';
        const requiredHomeItems =
            game.size === GameSize.Small
                ? GameSize.SmallItemCount
                : game.size === GameSize.Medium
                ? GameSize.MediumItemCount
                : GameSize.LargeItemCount;
        let homeItemCount = 0;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item?.name === 'home') {
                    homeItemCount++;
                }
            }
        }
        return homeItemCount !== requiredHomeItems ? `❌ ${requiredHomeItems} home items must be placed.` : null;
    }

    private validateItemCount(game: Game): string | null {
        if (!game.grid) return '❌ No grid found';
        let itemCount = 0;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item && tile.item.name !== 'home' && tile.item.name !== 'flag') {
                    itemCount++;
                }
            }
        }
        const requiredItemCount = game.size === GameSize.Small ? ItemCount.Small : game.size === GameSize.Medium ? ItemCount.Medium : ItemCount.Large;
        return itemCount !== requiredItemCount ? '❌ All items must be placed.' : null;
    }

    private validateAllTerrainAccessible(game: Game): string[] {
        if (!game.grid || game.grid.length === 0) {
            return ['❌ No grid found'];
        }

        const start = this.findAccessibleStart(game);
        if (!start) {
            return ['❌ No accessible terrain found.'];
        }

        const visited = this.performBFS(game, start.row, start.col);
        return this.checkForInaccessible(game, visited);
    }

    private findAccessibleStart(game: Game): { row: number; col: number } | null {
        if (!game.grid) return null;

        const numRows = game.grid.length;
        const numCols = game.grid[0]?.length || 0;

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (game.grid[i]?.[j]?.type !== TileType.Wall) {
                    return { row: i, col: j };
                }
            }
        }
        return null;
    }

    private performBFS(game: Game, startRow: number, startCol: number): boolean[][] {
        if (!game.grid) return [];

        const numRows = game.grid.length;
        const numCols = game.grid[0]?.length || 0;
        const visited: boolean[][] = Array.from({ length: numRows }, () => Array(numCols).fill(false));
        const queue: { row: number; col: number }[] = [];
        visited[startRow][startCol] = true;
        queue.push({ row: startRow, col: startCol });

        const directions = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 },
        ];

        while (queue.length > 0) {
            const next = queue.shift();
            if (next) {
                const { row, col } = next;
                for (const { dr, dc } of directions) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (newRow < 0 || newRow >= numRows || newCol < 0 || newCol >= numCols) {
                        continue;
                    }
                    if (visited[newRow][newCol] || game.grid[newRow]?.[newCol]?.type === TileType.Wall) {
                        continue;
                    }
                    visited[newRow][newCol] = true;
                    queue.push({ row: newRow, col: newCol });
                }
            }
        }
        return visited;
    }

    private checkForInaccessible(game: Game, visited: boolean[][]): string[] {
        if (!game.grid) return [];

        const numRows = game.grid.length;
        const numCols = game.grid[0]?.length || 0;

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (game.grid[i]?.[j]?.type !== TileType.Wall && !visited[i][j]) {
                    return ['❌ There are inaccessible tiles in the grid.'];
                }
            }
        }
        return [];
    }

    private hasWallsOnSameAxis(game: Game, i: number, j: number): boolean {
        return (this.isWall(game, i - 1, j) && this.isWall(game, i + 1, j)) || (this.isWall(game, i, j - 1) && this.isWall(game, i, j + 1));
    }

    private hasTerrainOnOtherAxis(game: Game, i: number, j: number): boolean {
        return (
            (!this.isWallOrDoor(game, i - 1, j) && !this.isWallOrDoor(game, i + 1, j)) ||
            (!this.isWallOrDoor(game, i, j - 1) && !this.isWallOrDoor(game, i, j + 1))
        );
    }

    private isWall(game: Game, i: number, j: number): boolean {
        return !!game.grid?.[i]?.[j] && game.grid[i][j].type === TileType.Wall;
    }

    private isWallOrDoor(game: Game, i: number, j: number): boolean {
        return !!game.grid?.[i]?.[j] && (game.grid[i][j].type === TileType.Wall || game.grid[i][j].type === TileType.Door);
    }

    private isTitleValid(title: string): boolean {
        const isLengthValid = title?.length > TitleLength.Min && title.length <= TitleLength.Max;
        const isUniqueTitle = !this.gameService.isGameNameUsed(title);
        return isLengthValid && isUniqueTitle;
    }

    private isDescriptionValid(description: string): boolean {
        const isNotEmpty = description.length > DescriptionLength.Min;
        const isWithinLimit = description.length <= DescriptionLength.Max;
        return isNotEmpty && isWithinLimit;
    }

    private showError(message: string) {
        this.snackBar.open(message, 'Close', { duration: 3000 });
    }
}
