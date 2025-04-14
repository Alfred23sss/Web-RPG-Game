import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
import { ITEM_COUNTS, ITEMS_TO_UPDATE } from '@app/constants/global.constants';
import { Tile } from '@app/interfaces/tile';
import { GameService } from '@app/services/game/game.service';
import { GameSize } from '@common/enums';

@Injectable({
    providedIn: 'root',
})
export class ItemService {
    private items: Item[] = [];

    constructor(private gameService: GameService) {}

    setItems(items: Item[], gameMode: string | undefined): void {
        if (gameMode === 'CTF') {
            this.items = items;
        } else {
            this.items = items.filter((item) => item.name !== 'flag');
        }
    }

    getItems(): Item[] {
        return this.items;
    }

    incrementItemCounter(name: string): void {
        const item = this.getItemByName(name);
        if (item) {
            item.itemCounter++;
        }
    }

    setItemCount(): void {
        const currentGame = this.gameService.getCurrentGame();
        if (!currentGame) {
            return;
        }

        const rawSize = currentGame.size as unknown as number;
        const sizeMapping: Record<'size10' | 'size15' | 'size20', GameSize> = {
            size10: GameSize.Small,
            size15: GameSize.Medium,
            size20: GameSize.Large,
        };

        const mappedSize = sizeMapping[`size${rawSize}` as keyof typeof sizeMapping] ?? GameSize.Small;

        const count = ITEM_COUNTS[mappedSize];

        this.items.forEach((item) => {
            if (ITEMS_TO_UPDATE.has(item.name)) {
                item.itemCounter = count;
            }
        });

        this.updateItemCountersBasedOnGrid(currentGame.grid);
    }

    private getItemByName(name: string): Item | undefined {
        return this.items.find((item) => item.name === name);
    }

    private updateItemCountersBasedOnGrid(grid: Tile[][] | undefined): void {
        if (!grid) return;

        grid.forEach((row) => {
            row.forEach((tile) => {
                if (tile.item) {
                    const item = this.getItemByName(tile.item.name);
                    if (item) {
                        item.itemCounter = Math.max(0, item.itemCounter - 1);
                    }
                }
            });
        });
    }
}
