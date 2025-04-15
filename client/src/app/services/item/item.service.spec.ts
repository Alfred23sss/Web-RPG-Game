/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item/item';
import { GRID_DIMENSIONS } from '@app/constants/global.constants';
import { Tile } from '@app/interfaces/tile';
import { GameService } from '@app/services/game/game.service';
import { GameSize, TileType } from '@common/enums';
import { ItemService } from './item.service';

const EXPECTED_ITEM_COUNT_MEDIUM = 4;
const EXPECTED_ITEM_COUNT_DEFAULT = 1;
const DEFAULT_GAME_SIZE = GameSize.Small;

const getSizeString = (size: GameSize) => GRID_DIMENSIONS[size].toString();

const SIZE_MAPPING: Record<string, GameSize> = {
    [getSizeString(GameSize.Small)]: GameSize.Small,
    [getSizeString(GameSize.Medium)]: GameSize.Medium,
    [getSizeString(GameSize.Large)]: GameSize.Large,
};

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

    describe('setItems', () => {
        it('should set all items when game mode is CTF', () => {
            const testItems = [new Item({ id: '1', name: 'flag', itemCounter: 1 }), new Item({ id: '2', name: 'potion', itemCounter: 2 })];

            service.setItems(testItems, 'CTF');
            expect(service.getItems()).toEqual(testItems);
        });

        it('should filter out flag items when game mode is not CTF', () => {
            const testItems = [new Item({ id: '1', name: 'flag', itemCounter: 1 }), new Item({ id: '2', name: 'potion', itemCounter: 2 })];
            const expectedItems = [testItems[1]];

            service.setItems(testItems, 'Classic');
            expect(service.getItems()).toEqual(expectedItems);
        });

        it('should handle empty items array', () => {
            service.setItems([], 'CTF');
            expect(service.getItems()).toEqual([]);
        });

        it('should handle undefined game mode by filtering flags', () => {
            const testItems = [new Item({ id: '1', name: 'flag', itemCounter: 1 }), new Item({ id: '2', name: 'potion', itemCounter: 2 })];
            const expectedItems = [testItems[1]];

            service.setItems(testItems, undefined);
            expect(service.getItems()).toEqual(expectedItems);
        });

        it('should handle null game mode by filtering flags', () => {
            const testItems = [new Item({ id: '1', name: 'flag', itemCounter: 1 }), new Item({ id: '2', name: 'potion', itemCounter: 2 })];
            const expectedItems = [testItems[1]];
            service.setItems(testItems, null as any);
            expect(service.getItems()).toEqual(expectedItems);
        });
    });

    it('should set and get items', () => {
        const testItems: Item[] = [new Item({ id: '1', name: 'potion', itemCounter: 1 }), new Item({ id: '2', name: 'fire', itemCounter: 2 })];
        service.setItems(testItems, gameServiceMock.getCurrentGame()?.mode);
        expect(service.getItems()).toEqual(testItems);
    });

    it('should increment item counter', () => {
        const testItem = new Item({ id: '1', name: 'potion', itemCounter: 1 });
        service.setItems([testItem], gameServiceMock.getCurrentGame()?.mode);

        service.incrementItemCounter('potion');
        expect(testItem.itemCounter).toBe(2);
    });

    it('should not increment counter if item does not exist', () => {
        service.setItems([], gameServiceMock.getCurrentGame()?.mode);
        service.incrementItemCounter('nonexistent');
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

        const testItems = [new Item({ id: '1', name: 'home', itemCounter: 1 }), new Item({ id: '2', name: 'question', itemCounter: 1 })];

        service.setItems(testItems, gameServiceMock.getCurrentGame()?.mode);
        service.setItemCount();

        expect(testItems[0].itemCounter).toBe(EXPECTED_ITEM_COUNT_MEDIUM);
        expect(testItems[1].itemCounter).toBe(EXPECTED_ITEM_COUNT_DEFAULT);
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
            itemCounter: 1,
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

        service.setItems([mockItemHome, mockItemQuestion], gameServiceMock.getCurrentGame()?.mode);
        service.setItemCount();

        expect(mockItemHome.itemCounter).toBe(1);
        expect(mockItemQuestion.itemCounter).toBe(0);
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

        const mappedSize = SIZE_MAPPING[rawSize] ?? DEFAULT_GAME_SIZE;

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

        const mappedSize = SIZE_MAPPING[rawSize] ?? DEFAULT_GAME_SIZE;

        expect(mappedSize).toBe(GameSize.Small);
    });
});
