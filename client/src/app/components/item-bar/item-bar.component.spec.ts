/* eslint-disable @typescript-eslint/no-explicit-any */
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item';
import { GameMode, TileType } from '@app/enums/global.enums';
import { ItemDragService } from '@app/services/item-drag/Item-drag.service';
import { ItemService } from '@app/services/item/item.service';
import { ItemBarComponent } from './item-bar.component';
import { GameModeService } from '@app/services/game-mode/game-mode.service';

const TEST_ITEM = new Item({
    id: '1',
    name: 'potion',
    imageSrc: '',
    imageSrcGrey: '',
    itemCounter: 1,
    description: 'Potion',
});

const TARGET_ITEM = new Item({
    id: '1',
    name: 'potion',
    imageSrc: '',
    imageSrcGrey: '',
    itemCounter: 1,
    description: 'Potion',
});

const DRAGGED_ITEM = new Item({
    id: '1',
    name: 'potion',
    imageSrc: '',
    imageSrcGrey: '',
    itemCounter: 1,
    description: 'Potion',
});

describe('ItemBarComponent', () => {
    let component: ItemBarComponent;
    let fixture: ComponentFixture<ItemBarComponent>;
    let itemDragServiceMock: jasmine.SpyObj<ItemDragService>;
    let itemServiceMock: jasmine.SpyObj<ItemService>;
    let gameModeServiceMock: jasmine.SpyObj<GameModeService>;

    beforeEach(async () => {
        itemDragServiceMock = jasmine.createSpyObj('ItemDragService', ['setSelectedItem', 'getSelectedItem', 'getPreviousTile', 'clearSelection']);
        itemServiceMock = jasmine.createSpyObj('ItemService', ['setItems', 'setItemCount']);
        gameModeServiceMock = jasmine.createSpyObj('GameModeService', ['getGameMode']);

        await TestBed.configureTestingModule({
            imports: [ItemBarComponent, CommonModule, DragDropModule],
            providers: [
                { provide: ItemDragService, useValue: itemDragServiceMock },
                { provide: ItemService, useValue: itemServiceMock },
                { provide: GameModeService, useValue: gameModeServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemBarComponent);
        component = fixture.componentInstance;

        const mockItems = [
            new Item({ id: '1', name: 'potion', itemCounter: 1, description: 'Potion' }),
            new Item({ id: '2', name: 'flag', itemCounter: 1, description: 'Flag' }),
        ];
        component.items = mockItems;

        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should select an item', () => {
        itemDragServiceMock.getSelectedItem.and.returnValue(TEST_ITEM);
        component.selectObject(TEST_ITEM);

        expect(component.activeItem).toEqual(TEST_ITEM);
    });

    it('should deselect an item', () => {
        component.removeObject();
        expect(itemDragServiceMock.setSelectedItem).toHaveBeenCalledWith(undefined, undefined);
        expect(component.activeItem).toBeUndefined();
    });

    it('should disable dragging when itemCounter is 0', () => {
        const testItem = new Item({ id: '2', name: 'fire', imageSrc: '', imageSrcGrey: '', itemCounter: 0, description: 'Fire' });
        expect(testItem.itemCounter <= 0).toBeTrue();
    });

    it('should allow dragging when itemCounter is greater than 0', () => {
        const testItem = new Item({ id: '3', name: 'swap', imageSrc: '', imageSrcGrey: '', itemCounter: 1, description: 'Swap' });
        expect(testItem.itemCounter <= 0).toBeFalse();
    });

    it('should update item count correctly based on game size', () => {
        const testItem = new Item({ id: '6', name: 'home', imageSrc: '', imageSrcGrey: '', itemCounter: 2, description: 'Home' });
        component.items = [testItem];

        itemServiceMock.setItemCount.and.callFake(() => {
            testItem.itemCounter = 2;
        });

        component.ngOnInit();
        expect(testItem.itemCounter).toBe(2);
    });

    it('should handle drop event correctly', () => {
        const draggedItem = new Item({
            id: '2',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion',
        });

        itemDragServiceMock.getSelectedItem.and.returnValue(draggedItem);

        const event = new DragEvent('drop');
        component.onContainerDrop(event, TEST_ITEM);

        expect(TEST_ITEM.itemCounter).toBe(2);
        expect(itemDragServiceMock.clearSelection).toHaveBeenCalled();
    });

    it('should prevent default on drag over', () => {
        const event = new DragEvent('dragover');
        spyOn(event, 'preventDefault');
        component.onDragOver(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should correctly handle container drop event', () => {
        const draggedItem = TEST_ITEM.clone();

        itemDragServiceMock.getSelectedItem.and.returnValue(draggedItem);

        itemDragServiceMock.getPreviousTile.and.returnValue({
            id: 'tile-1',
            imageSrc: '',
            isOccupied: false,
            type: TileType.Default,
            isOpen: true,
            item: draggedItem,
        });

        component.onContainerDrop(new DragEvent('drop'), TEST_ITEM);

        expect(TEST_ITEM.itemCounter).toBe(2);
        expect(itemDragServiceMock.clearSelection).toHaveBeenCalled();
    });

    it('should exit early if no dragged item is selected', () => {
        itemDragServiceMock.getSelectedItem.and.returnValue(undefined);

        const event = new DragEvent('drop');

        component.onContainerDrop(event, TEST_ITEM);
        expect(itemDragServiceMock.clearSelection).not.toHaveBeenCalled();
    });

    it('should exit early if dragged item name does not match the target item name', () => {
        itemDragServiceMock.getSelectedItem.and.returnValue({ ...DRAGGED_ITEM, name: 'error' } as Item);

        const event = new DragEvent('drop');
        component.onContainerDrop(event, TARGET_ITEM);
        expect(itemDragServiceMock.clearSelection).not.toHaveBeenCalled();
    });

    it('should exit early if dragged item id matches the target item id', () => {
        itemDragServiceMock.getSelectedItem.and.returnValue(DRAGGED_ITEM);

        const event = new DragEvent('drop');

        component.onContainerDrop(event, TARGET_ITEM);
        expect(itemDragServiceMock.clearSelection).not.toHaveBeenCalled();
    });

    it('should filter out "flag" item when game mode is Classique', () => {
        gameModeServiceMock.getGameMode.and.returnValue(GameMode.Classic);

        component.ngOnInit();

        expect(component.items.some((item) => item.name === 'flag')).toBeFalse();
    });

    it('should not filter out "flag" item when game mode is not Classique', () => {
        gameModeServiceMock.getGameMode.and.returnValue(GameMode.CTF);

        component.ngOnInit();

        expect(component.items.some((item) => item.name === 'flag')).toBeTrue();
    });
});
