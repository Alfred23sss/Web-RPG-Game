import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Game } from '@app/interfaces/game';
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
@Injectable({
    providedIn: 'root',
})
export class GameValidationService {
    constructor(
        private gameService: GameService,
        private snackBar: MatSnackBar,
    ) {}

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
