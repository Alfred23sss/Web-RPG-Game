import { TestBed } from '@angular/core/testing';
import { ItemService } from './item.service';
import { Item } from '@app/interfaces/item';

describe('ItemService', () => {
    let service: ItemService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ItemService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set and get items', () => {
        const testItems: Item[] = [
            new Item({ id: '1', name: 'potion', itemCounter: 1 }),
            new Item({ id: '2', name: 'fire', itemCounter: 2 }),
        ];
        service.setItems(testItems);
        expect(service.getItems()).toEqual(testItems);
    });

    it('should retrieve an item by name', () => {
        const testItems: Item[] = [
            new Item({ id: '1', name: 'potion', itemCounter: 1 }),
            new Item({ id: '2', name: 'fire', itemCounter: 2 }),
        ];
        service.setItems(testItems);

        expect(service.getItemByName('potion')).toEqual(testItems[0]);
        expect(service.getItemByName('fire')).toEqual(testItems[1]);
        expect(service.getItemByName('nonexistent')).toBeUndefined();
    });

    it('should increment item counter', () => {
        const testItem = new Item({ id: '1', name: 'potion', itemCounter: 1 });
        service.setItems([testItem]);

        service.incrementItemCounter('potion');
        expect(testItem.itemCounter).toBe(2);
    });

    it('should not increment counter if item does not exist', () => {
        service.setItems([]);
        service.incrementItemCounter('nonexistent');
        expect(service.getItems()).toEqual([]);
    });

    it('should decrement item counter', () => {
        const testItem = new Item({ id: '1', name: 'potion', itemCounter: 2 });
        service.setItems([testItem]);

        service.decrementItemCounter('potion');
        expect(testItem.itemCounter).toBe(1);
    });

    it('should not decrement below zero', () => {
        const testItem = new Item({ id: '1', name: 'potion', itemCounter: 0 });
        service.setItems([testItem]);

        service.decrementItemCounter('potion');
        expect(testItem.itemCounter).toBe(0);
    });

    it('should not decrement counter if item does not exist', () => {
        service.setItems([]);
        service.decrementItemCounter('nonexistent');
        expect(service.getItems()).toEqual([]);
    });
});
