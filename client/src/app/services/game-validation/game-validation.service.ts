import { Injectable } from '@angular/core';
import { ErrorMessages, GameMode, ItemName, TileType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { GridPosition } from '@app/interfaces/tile';
import { GameService } from '@app/services/game/game.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';

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
    MediumItemCount = 4,
    LargeItemCount = 6,
}
enum ItemCount {
    Small = 2,
    Medium = 4,
    Large = 6,
}

enum MaxDuration {
    MaxDuration = 10000,
}

@Injectable({
    providedIn: 'root',
})
export class GameValidationService {
    constructor(
        private gameService: GameService,
        private snackBar: SnackbarService,
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
            errors.push(ErrorMessages.GridNotFound);
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
            errors.push(ErrorMessages.InvalidDoorPlacement);
        }
        return errors;
    }

    private validateHalfTerrain(game: Game): string[] {
        const errors: string[] = [];
        if (!game.grid) {
            errors.push(ErrorMessages.GridNotFound);
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
            errors.push(ErrorMessages.InvalidTerrainAmount);
        }
        return errors;
    }

    private validateTitleAndDescription(title: string, description: string): string[] {
        const errors: string[] = [];
        if (!this.isTitleValid(title)) {
            errors.push(ErrorMessages.InvalidNameSize);
        }
        if (!this.isDescriptionValid(description)) {
            errors.push(ErrorMessages.InvalidDescriptionSize);
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
        if (!game.grid) return ErrorMessages.GridNotFound;
        if (game.mode !== GameMode.CTF) return null;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item?.name === ItemName.Flag) {
                    return null;
                }
            }
        }
        return ErrorMessages.InvalidFlagPlacement;
    }

    private validateHomeItemsPlaced(game: Game): string | null {
        if (!game.grid) return ErrorMessages.GridNotFound;
        const requiredHomeItems =
            game.size === GameSize.Small
                ? GameSize.SmallItemCount
                : game.size === GameSize.Medium
                ? GameSize.MediumItemCount
                : GameSize.LargeItemCount;
        let homeItemCount = 0;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item?.name === ItemName.Home) {
                    homeItemCount++;
                }
            }
        }
        return homeItemCount !== requiredHomeItems ? `❌ ${requiredHomeItems} ${ErrorMessages.MustPlaceHouseItems}` : null;
    }

    private validateItemCount(game: Game): string | null {
        if (!game.grid) return ErrorMessages.GridNotFound;
        let itemCount = 0;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item && tile.item.name !== ItemName.Home && tile.item.name !== ItemName.Flag) {
                    itemCount++;
                }
            }
        }
        const requiredItemCount = game.size === GameSize.Small ? ItemCount.Small : game.size === GameSize.Medium ? ItemCount.Medium : ItemCount.Large;
        return itemCount < requiredItemCount ? ErrorMessages.ItemsNotPlaced : itemCount > requiredItemCount ? ErrorMessages.TooManyItemsPlaced : null;
    }

    private validateAllTerrainAccessible(game: Game): ErrorMessages[] | string[] {
        if (!game.grid || game.grid.length === 0) {
            return [ErrorMessages.GridNotFound];
        }

        const start = this.findAccessibleStart(game);
        if (!start) {
            return [ErrorMessages.InnacessibleTerrain];
        }

        const visited = this.performBFS(game, start.row, start.col);
        return this.checkForInaccessible(game, visited);
    }

    private findAccessibleStart(game: Game): GridPosition | null {
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
        if (!game.grid || game.grid.length === 0 || game.grid[0].length === 0) return [];

        const numRows = game.grid.length;
        const numCols = game.grid[0].length;
        const visited: boolean[][] = this.initializeVisited(numRows, numCols);
        const queue: GridPosition[] = [{ row: startRow, col: startCol }];
        visited[startRow][startCol] = true;

        while (queue.length > 0) {
            const next = queue.shift();
            if (next) {
                this.processNeighbors(next.row, next.col, game, visited, queue);
            }
        }
        return visited;
    }

    private initializeVisited(rows: number, cols: number): boolean[][] {
        return Array.from({ length: rows }, () => Array(cols).fill(false));
    }

    private processNeighbors(row: number, col: number, game: Game, visited: boolean[][], queue: { row: number; col: number }[]): void {
        if (!game.grid) return;

        const directions = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 },
        ];

        for (const { dr, dc } of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidMove(newRow, newCol, game, visited)) {
                visited[newRow][newCol] = true;
                queue.push({ row: newRow, col: newCol });
            }
        }
    }

    private isValidMove(row: number, col: number, game: Game, visited: boolean[][]): boolean {
        return (
            !!game.grid &&
            row >= 0 &&
            row < game.grid.length &&
            col >= 0 &&
            col < game.grid[0].length &&
            !visited[row][col] &&
            (game.grid[row]?.[col]?.type ?? TileType.Default) !== TileType.Wall
        );
    }

    private checkForInaccessible(game: Game, visited: boolean[][]): string[] {
        if (!game.grid) return [];

        const numRows = game.grid.length;
        const numCols = game.grid[0]?.length || 0;

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (game.grid[i]?.[j]?.type !== TileType.Wall && !visited[i][j]) {
                    return [ErrorMessages.SomeTilesInnacessible];
                }
            }
        }
        return [];
    }

    private hasWallsOnSameAxis(game: Game, i: number, j: number): boolean {
        const wallAbove = this.isWall(game, i - 1, j);
        const wallBelow = this.isWall(game, i + 1, j);
        const wallLeft = this.isWall(game, i, j - 1);
        const wallRight = this.isWall(game, i, j + 1);
        return (wallAbove && wallBelow) || (wallLeft && wallRight);
    }

    private hasTerrainOnOtherAxis(game: Game, i: number, j: number): boolean {
        const terrainAbove = !this.isWallOrDoor(game, i - 1, j);
        const terrainBelow = !this.isWallOrDoor(game, i + 1, j);
        const terrainLeft = !this.isWallOrDoor(game, i, j - 1);
        const terrainRight = !this.isWallOrDoor(game, i, j + 1);
        return (terrainAbove && terrainBelow) || (terrainLeft && terrainRight);
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
        const regex = /^(?!\s)[a-zA-Z0-9]+(?:\s[a-zA-Z0-9]+)*$/;
        return isLengthValid && isUniqueTitle && regex.test(title);
    }

    private isDescriptionValid(description: string): boolean {
        const isNotEmpty = description.length > DescriptionLength.Min;
        const isWithinLimit = description.length <= DescriptionLength.Max;
        return isNotEmpty && isWithinLimit;
    }

    private showError(message: string): void {
        this.snackBar.showMessage(message, 'Close', MaxDuration.MaxDuration);
    }
}
