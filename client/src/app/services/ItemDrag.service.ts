import { Injectable } from '@angular/core';
import { Item } from '@app/interfaces/item'; // Make sure the correct path is imported

@Injectable({
    providedIn: 'root',
})
export class ItemDragService {
    private selectedItem: Item | undefined = undefined;

    setSelectedItem(item: Item | undefined): void {
        this.selectedItem = item;
    }

    getSelectedItem(): Item | undefined {
        return this.selectedItem;
    }

    modifyItemCounter(): void {
        if (this.selectedItem && this.selectedItem.itemCounter > 0) {
            this.selectedItem.itemCounter--;
        }
    }
}
