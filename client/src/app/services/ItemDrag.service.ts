import { Injectable } from '@angular/core';
import { Item } from '@app/interfaces/item';
import { Tile } from '@app/interfaces/tile'; // Ensure correct path

@Injectable({
    providedIn: 'root',
})
export class ItemDragService {
    private selectedItem: Item | undefined = undefined;
    private previousTile: Tile | undefined = undefined; // Store the previous tile

    setSelectedItem(item: Item | undefined, tile: Tile | undefined): void {
        this.selectedItem = item;
        this.previousTile = tile; // Store the tile where the item was originally placed
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

    modifyItemCounter(): void {
        if (this.selectedItem && this.selectedItem.itemCounter > 0) {
            this.selectedItem.itemCounter--;
        }
    }
}
