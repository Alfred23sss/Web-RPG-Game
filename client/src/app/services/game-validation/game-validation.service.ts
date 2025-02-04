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
}

enum ClassicItemCount {
    Small = 10,
    Medium = 14,
    Large = 18,
}

enum OtherModeItemCount {
    Small = 11,
    Medium = 15,
    Large = 19,
}
@Injectable({
    providedIn: 'root',
})
export class GameValidationService {
    constructor(
        private gameService: GameService,
        private snackBar: MatSnackBar,
    ) {}

    isDoorPositionValid(game: Game): boolean {
        if (!game.grid) {
            return false;
        }

        const numRows = game.grid.length;
        const numCols = game.grid[0].length;

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                const tile = game.grid[i][j];

                if (tile.type === TileType.Door) {
                    if (i === 0 || j === 0 || i === numRows - 1 || j === numCols - 1) {
                        this.showError(`❌ Door at (${i + 1}, ${j + 1}) cannot be placed on the edge.`);
                        return false;
                    }

                    const hasWallOnSameAxis = this.hasWallsOnSameAxis(game, i, j);
                    const hasTerrainOnOtherAxis = this.hasTerrainOnOtherAxis(game, i, j);

                    if (!hasWallOnSameAxis || !hasTerrainOnOtherAxis) {
                        this.showError(`❌ Door at (${i + 1}, ${j + 1}) is not correctly placed.`);
                        return false;
                    }
                }
            }
        }
        return true;
    }

    isHalfTerrain(game: Game) {
        if (!game.grid) {
            return;
        }
        const terrainProportionMin = 0.5;
        const gridSize = Math.pow(Number(game.size), 2);
        let terrainTileCount = 0;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.type !== TileType.Wall && tile.type !== TileType.Door) {
                    terrainTileCount++;
                }
                if (terrainTileCount / gridSize > terrainProportionMin) {
                    return true;
                }
            }
        }
        // create var for calcul
        if (terrainTileCount / gridSize <= terrainProportionMin) {
            this.showError('❌ Grid must be more than 50% terrain (Default, Ice or Water');
        }
        return terrainTileCount / gridSize > terrainProportionMin;
    }

    isTitleAndDescriptionValid(title: string, description: string) {
        return this.isTitleValid(title) && this.isDescriptionValid(description);
    }

    isItemCountValid(game: Game): boolean {
        if (!game.grid) {
            this.showError('❌ No grid found');
            return false;
        }

        let itemCount = 0;
        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item) {
                    itemCount++;
                }
            }
        }

        const expectedItemCount =
            game.size === GameSize.Small
                ? game.mode === 'Classic'
                    ? ClassicItemCount.Small
                    : OtherModeItemCount.Small
                : game.size === GameSize.Large
                ? game.mode === 'Classic'
                    ? ClassicItemCount.Large
                    : OtherModeItemCount.Large
                : game.mode === 'Classic'
                ? ClassicItemCount.Medium
                : OtherModeItemCount.Medium;

        if (itemCount !== expectedItemCount) {
            this.showError('❌ All items must be placed');
            return false;
        }
        return true;
    }

    isFlagPlaced(game: Game): boolean {
        if (!game.grid) {
            this.showError('❌ No grid found');
            return false;
        }

        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item?.name === 'flag') {
                    return true;
                }
            }
        }

        this.showError('❌ Flag must be placed on the map.');
        return false;
    }

    areHomeItemsPlaced(game: Game): boolean {
        if (!game.grid) {
            this.showError('❌ No grid found');
            return false;
        }

        const requiredHomeItems = game.size === GameSize.Small ? 2 : game.size === GameSize.Medium ? 4 : 6;
        let homeItemCount = 0;

        for (const row of game.grid) {
            for (const tile of row) {
                if (tile.item?.name === 'home') {
                    homeItemCount++;
                }
            }
        }

        if (homeItemCount < requiredHomeItems) {
            this.showError(`❌ ${requiredHomeItems} home items must be placed.`);
            return false;
        }

        return true;
    }

    isItemValid(game: Game): boolean {
        if (game.mode !== GameMode.CTF) {
            return this.areHomeItemsPlaced(game) && this.isItemCountValid(game);
        }
        return this.isFlagPlaced(game) && this.areHomeItemsPlaced(game) && this.isItemCountValid(game);
    }

    // eslint-disable-next-line complexity
    isAllTerrainAccessible(game: Game): boolean {
        if (!game.grid || game.grid.length === 0) {
            this.showError('❌ No grid found');
            return false;
        }

        const numRows = game.grid.length;
        const numCols = game.grid[0].length;

        let startRow = -1;
        let startCol = -1;
        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (game.grid[i][j].type !== TileType.Wall) {
                    startRow = i;
                    startCol = j;
                    break;
                }
            }
            if (startRow !== -1) {
                break;
            }
        }

        if (startRow === -1) {
            this.showError('❌ No accessible terrain found.');
            return false;
        }

        const visited: boolean[][] = Array.from({ length: numRows }, () => Array(numCols).fill(false));

        const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
        visited[startRow][startCol] = true;

        const directions = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 },
        ];

        while (queue.length > 0) {
            const { row, col } = queue.shift()!;
            for (const { dr, dc } of directions) {
                const newRow = row + dr;
                const newCol = col + dc;

                if (newRow < 0 || newRow >= numRows || newCol < 0 || newCol >= numCols) {
                    continue;
                }

                if (visited[newRow][newCol] || game.grid[newRow][newCol].type === TileType.Wall) {
                    continue;
                }

                visited[newRow][newCol] = true;
                queue.push({ row: newRow, col: newCol });
            }
        }

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (game.grid[i][j].type !== TileType.Wall && !visited[i][j]) {
                    this.showError(`❌ The tile at position (${i}, ${j}) is inaccessible.`);
                    return false;
                }
            }
        }

        return true;
    }

    private hasWallsOnSameAxis(game: Game, i: number, j: number): boolean {
        return (this.isWall(game, i - 1, j) && this.isWall(game, i + 1, j)) || (this.isWall(game, i, j - 1) && this.isWall(game, i, j + 1)); // Horizontal check
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

        if (!isLengthValid) {
            this.showError('❌ Name must be between 1 and 30 characters');
        }
        if (!isUniqueTitle) {
            this.showError('❌ The name is already in use');
        }

        return isLengthValid && isUniqueTitle;
    }

    private showError(message: string) {
        this.snackBar.open(message, 'Close', { duration: 3000 });
    }

    private isDescriptionValid(description: string): boolean {
        const isEmpty = description.length > DescriptionLength.Min;
        const isTooLong = description.length <= DescriptionLength.Max;
        if (!isEmpty) {
            this.showError('❌ Description cannot be empty');
        }
        if (!isTooLong) {
            this.showError('❌ Description is too long');
        }
        return isEmpty && isTooLong;
    }
}
