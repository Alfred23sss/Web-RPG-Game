import { Injectable } from '@angular/core';
import { Item } from '@app/interfaces/item';

@Injectable({
    providedIn: 'root',
})
export class ItemService {
    private items: Item[] = [];

    setItems(items: Item[]): void {
        this.items = items;
    }

    getItems(): Item[] {
        return this.items;
    }

    getItemByName(name: string): Item | undefined {
        return this.items.find((item) => item.name === name);
    }

    incrementItemCounter(name: string): void {
        const item = this.getItemByName(name);
        if (item) {
            item.itemCounter++;
        }
    }
    decrementItemCounter(name: string): void {
        const item = this.getItemByName(name);
        if (item && item.itemCounter > 0) {
            item.itemCounter--;
        }
    }
}
