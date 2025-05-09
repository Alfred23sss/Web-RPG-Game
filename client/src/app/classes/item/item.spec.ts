import { GameData } from '@app/classes/game-data/game-data';
import { Item } from './item';

describe('Item', () => {
    let item: Item;

    beforeEach(() => {
        item = new Item({
            id: '12345',
            name: 'Test Item',
            imageSrc: 'test.jpg',
            imageSrcGrey: 'test-grey.jpg',
            description: 'Test description',
            itemCounter: 1,
        });
    });

    it('should create an instance with given values', () => {
        expect(item.id).toBe('12345');
        expect(item.name).toBe('Test Item');
        expect(item.imageSrc).toBe('test.jpg');
        expect(item.imageSrcGrey).toBe('test-grey.jpg');
        expect(item.description).toBe('Test description');
        expect(item.itemCounter).toBe(1);
    });

    it('should generate a unique ID format', () => {
        const clonedItem1 = item.clone();
        const clonedItem2 = item.clone();

        expect(clonedItem1.id).not.toBe(item.id);
        expect(clonedItem2.id).not.toBe(clonedItem1.id);
    });

    it('should update properties with update()', () => {
        const gameData = new GameData();
        gameData.update({ isInCombatMode: true });
        expect(gameData.isInCombatMode).toBeTrue();
    });
});
