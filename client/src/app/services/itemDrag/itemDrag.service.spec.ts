import { TestBed } from '@angular/core/testing';
import { Item } from '@app/interfaces/item';
import { Tile } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/itemDrag/ItemDrag.service';

describe('ItemDragService', () => {
    let service: ItemDragService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ItemDragService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set selected item and previous tile', () => {
        const item: Item = { name: 'TestItem', itemCounter: 5 } as Item;
        const tile: Tile = { id: '1-1' } as Tile;

        service.setSelectedItem(item, tile);

        expect(service.getSelectedItem()).toBe(item);
        expect(service.getPreviousTile()).toBe(tile);
    });

    it('should clear selection', () => {
        const item: Item = { name: 'TestItem', itemCounter: 5 } as Item;
        const tile: Tile = { id: '1-1' } as Tile;

        service.setSelectedItem(item, tile);
        service.clearSelection();

        expect(service.getSelectedItem()).toBeUndefined();
        expect(service.getPreviousTile()).toBeUndefined();
    });

    it('should decrease item counter if selected item exists and counter is greater than zero', () => {
        const item: Item = { name: 'TestItem', itemCounter: 3 } as Item;
        service.setSelectedItem(item, undefined);

        service.decreaseItemCounter();
        expect(item.itemCounter).toBe(2);
    });

    it('should not decrease item counter if selected item is undefined', () => {
        service.decreaseItemCounter();
        expect(service.getSelectedItem()).toBeUndefined();
    });

    it('should not decrease item counter below zero', () => {
        const item: Item = { name: 'TestItem', itemCounter: 0 } as Item;
        service.setSelectedItem(item, undefined);

        service.decreaseItemCounter();
        expect(item.itemCounter).toBe(0);
    });

    it('should increase item counter if selected item exists', () => {
        const item: Item = { name: 'TestItem', itemCounter: 2 } as Item;
        service.setSelectedItem(item, undefined);

        service.increaseItemCounter();
        expect(item.itemCounter).toBe(3);
    });

    it('should not increase item counter if selected item is undefined', () => {
        service.increaseItemCounter();
        expect(service.getSelectedItem()).toBeUndefined();
    });
});
