import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemBarComponent } from './item-bar.component';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { GameService } from '@app/services/game/game.service';
import { ItemService } from '@app/services/item/item.service';
import { Item } from '@app/interfaces/item';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Game, GameSize } from '@app/interfaces/game';
import { TileType, Tile, ItemType, ItemDescription } from '@app/interfaces/tile';

describe('ItemBarComponent', () => {
    let component: ItemBarComponent;
    let fixture: ComponentFixture<ItemBarComponent>;
    let itemDragServiceMock: jasmine.SpyObj<ItemDragService>;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let itemServiceMock: jasmine.SpyObj<ItemService>;

    beforeEach(async () => {
        itemDragServiceMock = jasmine.createSpyObj('ItemDragService', ['setSelectedItem', 'getSelectedItem', 'getPreviousTile', 'clearSelection']);
        gameServiceMock = jasmine.createSpyObj('GameService', ['getCurrentGame']);
        itemServiceMock = jasmine.createSpyObj('ItemService', ['setItems']);

        await TestBed.configureTestingModule({
            imports: [ItemBarComponent, CommonModule, DragDropModule],
            providers: [
                { provide: ItemDragService, useValue: itemDragServiceMock },
                { provide: GameService, useValue: gameServiceMock },
                { provide: ItemService, useValue: itemServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemBarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize items and set them in the service', () => {
        expect(component.items.length).toBeGreaterThan(0);
        expect(itemServiceMock.setItems).toHaveBeenCalledWith(component.items);
    });

    it('should select an item', () => {
        const testItem = new Item({
            id: '1',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion'
        });
    
        itemDragServiceMock.getSelectedItem.and.returnValue(testItem);
        component.selectObject(testItem);
    
        expect(component.activeItem).toEqual(testItem);
    });
    

    it('should deselect an item', () => {
        component.removeObject();
        expect(itemDragServiceMock.setSelectedItem).toHaveBeenCalledWith(undefined, undefined);
        expect(component.activeItem).toBeUndefined();
    });

    it('should disable dragging when itemCounter is 0', () => {
        const testItem = new Item({ id: '2', name: 'fire', imageSrc: '', imageSrcGrey: '', itemCounter: 0, description: 'Fire' });
        expect(component.isDragDisabled(testItem)).toBeTrue();
    });

    it('should allow dragging when itemCounter is greater than 0', () => {
        const testItem = new Item({ id: '3', name: 'swap', imageSrc: '', imageSrcGrey: '', itemCounter: 1, description: 'Swap' });
        expect(component.isDragDisabled(testItem)).toBeFalse();
    });

    it('should update item count correctly based on game size', () => {
        const mockGame: Game = {
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
        component.setItemCount();

        expect(component.items.find((item) => item.name === 'home')!.itemCounter).toBe(2);
    });

    it('should correctly handle container drop event', () => {
        const testItem = new Item({
            id: '1',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion'
        });
    
        const draggedItem = testItem.clone();
    
        itemDragServiceMock.getSelectedItem.and.returnValue(draggedItem);
    
        itemDragServiceMock.getPreviousTile.and.returnValue({
            id: 'tile-1',
            imageSrc: '',
            isOccupied: false,
            type: TileType.Default,
            isOpen: true,
            item: draggedItem
        });
    
        component.onContainerDrop(new DragEvent('drop'), testItem);
    
        expect(testItem.itemCounter).toBe(2);
        expect(itemDragServiceMock.clearSelection).toHaveBeenCalled();
    });

    it('should prevent default on drag over', () => {
        const event = new DragEvent('dragover');
        spyOn(event, 'preventDefault');
        component.onDragOver(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should correctly clone an item with a unique ID', () => {
        const originalItem = new Item({ id: 'test-id', name: 'test', imageSrc: '', imageSrcGrey: '', itemCounter: 1, description: 'Test Item' });
        const clonedItem = originalItem.clone();

        expect(clonedItem).not.toBe(originalItem);
        expect(clonedItem.id).not.toEqual(originalItem.id);
        expect(clonedItem.originalReference).toBe(originalItem);
    });

    it('should update itemCounter based on grid data', () => {
        const mockItemHome = new Item({
            id: '6',
            name: 'home',
            imageSrc: ItemType.Home,
            imageSrcGrey: ItemType.HomeGray,
            itemCounter: 2,
            description: ItemDescription.Home,
        });
    
        const mockItemQuestion = new Item({
            id: '7',
            name: 'question',
            imageSrc: ItemType.QuestionMark,
            imageSrcGrey: ItemType.QuestionMarkGray,
            itemCounter: 2,
            description: ItemDescription.QuestionMark,
        });
        const mockGrid: Tile[][] = [
            [
                {
                    id: 'tile1',
                    item: mockItemHome,
                    type: TileType.Default,
                    imageSrc: '',
                    isOccupied: true,
                    isOpen: true,
                },
                {
                    id: 'tile2',
                    item: undefined,
                    type: TileType.Default,
                    imageSrc: '',
                    isOccupied: false,
                    isOpen: true,
                }
            ],
            [
                {
                    id: 'tile3',
                    item: mockItemQuestion,
                    type: TileType.Default,
                    imageSrc: '',
                    isOccupied: true,
                    isOpen: true,
                },
                {
                    id: 'tile4',
                    item: undefined,
                    type: TileType.Default,
                    imageSrc: '',
                    isOccupied: false,
                    isOpen: true,
                }
            ]
        ];
    
        const mockGame: Game = {
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
    
        component.setItemCount();
    
        expect(mockItemHome.itemCounter).toBe(2);
        expect(mockItemQuestion.itemCounter).toBe(2);
    });
    it('should exit early if no dragged item is selected', () => {
        itemDragServiceMock.getSelectedItem.and.returnValue(undefined);
        
        const testItem = new Item({
            id: '1',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion'
        });
    
        const event = new DragEvent('drop');

        component.onContainerDrop(event, testItem);
        expect(itemDragServiceMock.clearSelection).not.toHaveBeenCalled();
    });
    
    it('should exit early if dragged item name does not match the target item name', () => {
        const draggedItem = new Item({
            id: '2',
            name: 'fire',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Fire'
        });
    
        itemDragServiceMock.getSelectedItem.and.returnValue(draggedItem);
        
        const targetItem = new Item({
            id: '1',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion'
        });
    
        const event = new DragEvent('drop');
        component.onContainerDrop(event, targetItem);
        expect(itemDragServiceMock.clearSelection).not.toHaveBeenCalled();
    });
    
    it('should exit early if dragged item id matches the target item id', () => {
        const draggedItem = new Item({
            id: '1',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion'
        });
    
        itemDragServiceMock.getSelectedItem.and.returnValue(draggedItem);
        
        const targetItem = new Item({
            id: '1',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion'
        });
    
        const event = new DragEvent('drop');
        
        component.onContainerDrop(event, targetItem);
        expect(itemDragServiceMock.clearSelection).not.toHaveBeenCalled();
    });    

    it('should map rawSize to correct GameSize', () => {
        const mockGame: Game = {
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
    
        component.setItemCount();
        const rawSize = mockGame.size as unknown as number;
        const sizeMapping: Record<number, GameSize> = {
            10: GameSize.Small,
            15: GameSize.Medium,
            20: GameSize.Large,
        };
        const mappedSize = sizeMapping[rawSize] ?? GameSize.Small;
        expect(mappedSize).toBe(GameSize.Medium);
    });
    
    it('should default to GameSize.Small if rawSize does not match any key', () => {
        const mockGame: Game = {
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

        component.setItemCount();
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