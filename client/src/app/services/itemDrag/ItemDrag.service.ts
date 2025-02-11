import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
import { Tile } from '@app/interfaces/tile';

@Injectable({
    providedIn: 'root',
})
export class ItemDragService {
    private selectedItem: Item | undefined = undefined;
    private previousTile: Tile | undefined = undefined;

    setSelectedItem(item: Item | undefined, tile: Tile | undefined): void {
        this.selectedItem = item;
        this.previousTile = tile;
    }

    getSelectedItem(): Item | undefined {
        return this.selectedItem;
    }

    getPreviousTile(): Tile | undefined {
        return this.previousTile;
    }

    clearSelection(): void {
        this.selectedItem = undefined;
        this.previousTile = undefined;
    }

    decreaseItemCounter(): void {
        if (this.selectedItem && this.selectedItem.itemCounter > 0) {
            this.selectedItem.itemCounter--;
        }
    }

    increaseItemCounter(): void {
        if (this.selectedItem) {
            this.selectedItem.itemCounter++;
        }
    }
}
