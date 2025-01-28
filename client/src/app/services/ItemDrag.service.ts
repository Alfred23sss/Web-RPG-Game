import { Injectable } from '@angular/core';
import { ItemComponent } from '@app/components/item/item.component'; // Make sure the correct path is imported

@Injectable({
    providedIn: 'root',
})
export class ItemDragService {
    private selectedItem: ItemComponent | undefined = undefined;

    setSelectedItem(item: ItemComponent | undefined): void {
        this.selectedItem = item;
    }

    getSelectedItem(): ItemComponent | undefined {
        return this.selectedItem;
    }

    modifyItemCounter(): void {
        if (this.selectedItem && this.selectedItem.itemCounter > 0) {
            this.selectedItem.itemCounter--;
        }
    }
}
