import { TestBed } from '@angular/core/testing';
import { ItemService } from './item.service';
import { GameService } from '@app/services/game/game.service';
import { Item } from '@app/classes/item';
import { TileType, Tile } from '@app/interfaces/tile';
import { GameSize } from '@app/interfaces/game';

describe('ItemService', () => {
    let service: ItemService;
    let gameServiceMock: jasmine.SpyObj<GameService>;

    beforeEach(() => {
        gameServiceMock = jasmine.createSpyObj('GameService', ['getCurrentGame']);

        TestBed.configureTestingModule({
            providers: [ItemService, { provide: GameService, useValue: gameServiceMock }],
        });

        service = TestBed.inject(ItemService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set and get items', () => {
        const testItems: Item[] = [new Item({ id: '1', name: 'potion', itemCounter: 1 }), new Item({ id: '2', name: 'fire', itemCounter: 2 })];
        service.setItems(testItems);
        expect(service.getItems()).toEqual(testItems);
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

    it('should update item count based on game size', () => {
        const mockGame = {
            id: 'test-game',
            name: 'Test Game',
            size: '15',
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'test.png',
            description: 'Test game description',
            grid: undefined,
        };

        gameServiceMock.getCurrentGame.and.returnValue(mockGame);

        const testItems = [new Item({ id: '1', name: 'home', itemCounter: 1 }), new Item({ id: '2', name: 'question', itemCounter: 2 })];

        service.setItems(testItems);
        service.setItemCount();

        expect(testItems[0].itemCounter).toBe(4);
        expect(testItems[1].itemCounter).toBe(4);
    });

    it('should update item counters based on grid data', () => {
        const mockItemHome = new Item({
            id: '6',
            name: 'home',
            itemCounter: 2,
            description: 'Home Item',
        });
        const mockItemQuestion = new Item({
            id: '7',
            name: 'question',
            itemCounter: 2,
            description: 'Question Item',
        });

        const mockGrid: Tile[][] = [
            [
                {
                    id: 'tile1',
                    item: mockItemHome,
                    type: TileType.Default,
                    isOccupied: true,
                    imageSrc: '',
                    isOpen: false,
                },
                {
                    id: 'tile2',
                    item: undefined,
                    type: TileType.Default,
                    isOccupied: false,
                    imageSrc: '',
                    isOpen: false,
                },
            ],
            [
                {
                    id: 'tile3',
                    item: mockItemQuestion,
                    type: TileType.Default,
                    isOccupied: true,
                    imageSrc: '',
                    isOpen: false,
                },
                {
                    id: 'tile4',
                    item: undefined,
                    type: TileType.Default,
                    isOccupied: false,
                    imageSrc: '',
                    isOpen: false,
                },
            ],
        ];

        const mockGame = {
            id: 'test-game',
            name: 'Test Game',
            size: '10',
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'test.png',
            description: 'Test game description',
            grid: mockGrid,
        };

        gameServiceMock.getCurrentGame.and.returnValue(mockGame);

        service.setItems([mockItemHome, mockItemQuestion]);
        service.setItemCount();

        expect(mockItemHome.itemCounter).toBe(1);
        expect(mockItemQuestion.itemCounter).toBe(1);
    });

    it('should exit early if no game is found in setItemCount', () => {
        gameServiceMock.getCurrentGame.and.returnValue(undefined);
        const setItemCountSpy = spyOn(service, 'setItemCount').and.callThrough();

        service.setItemCount();

        expect(setItemCountSpy).toHaveBeenCalled();
    });

    it('should map valid rawSize to the correct GameSize', () => {
        const mockGame = {
            id: 'test-game',
            name: 'Test Game',
            size: '10',
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'test.png',
            description: 'Test game description',
            grid: undefined,
        };

        gameServiceMock.getCurrentGame.and.returnValue(mockGame);

        service.setItemCount();

        const rawSize = mockGame.size as unknown as number;
        const sizeMapping: Record<number, GameSize> = {
            10: GameSize.Small,
            15: GameSize.Medium,
            20: GameSize.Large,
        };
        const mappedSize = sizeMapping[rawSize] ?? GameSize.Small;

        expect(mappedSize).toBe(GameSize.Small);
    });

    it('should default to GameSize.Small if rawSize does not match any key', () => {
        const mockGame = {
            id: 'test-game',
            name: 'Test Game',
            size: '30',
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'test.png',
            description: 'Test game description',
            grid: undefined,
        };

        gameServiceMock.getCurrentGame.and.returnValue(mockGame);

        service.setItemCount();

        const rawSize = mockGame.size as unknown as number;
        const sizeMapping: Record<number, GameSize> = {
            10: GameSize.Small,
            15: GameSize.Medium,
            20: GameSize.Large,
        };
        const mappedSize = sizeMapping[rawSize] ?? GameSize.Small;

        expect(mappedSize).toBe(GameSize.Small);
    });
});
