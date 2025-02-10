import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemBarComponent } from './item-bar.component';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { ItemService } from '@app/services/item/item.service';
import { Item } from '@app/interfaces/item';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { TileType } from '@app/interfaces/tile';

describe('ItemBarComponent', () => {
    let component: ItemBarComponent;
    let fixture: ComponentFixture<ItemBarComponent>;
    let itemDragServiceMock: jasmine.SpyObj<ItemDragService>;
    let itemServiceMock: jasmine.SpyObj<ItemService>;

    beforeEach(async () => {
        itemDragServiceMock = jasmine.createSpyObj('ItemDragService', ['setSelectedItem', 'getSelectedItem', 'getPreviousTile', 'clearSelection']);
        itemServiceMock = jasmine.createSpyObj('ItemService', ['setItems', 'setItemCount']);

        await TestBed.configureTestingModule({
            imports: [ItemBarComponent, CommonModule, DragDropModule],
            providers: [
                { provide: ItemDragService, useValue: itemDragServiceMock },
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
        expect(itemServiceMock.setItemCount).toHaveBeenCalled();
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
        const testItem = new Item({ id: '6', name: 'home', imageSrc: '', imageSrcGrey: '', itemCounter: 2, description: 'Home' });
        component.items = [testItem];

        itemServiceMock.setItemCount.and.callFake(() => {
            testItem.itemCounter = 2;
        });

        component.ngOnInit();
        expect(testItem.itemCounter).toBe(2);
    });

    it('should handle drop event correctly', () => {
        const testItem = new Item({
            id: '1',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion'
        });

        const draggedItem = new Item({
            id: '2',
            name: 'potion',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 1,
            description: 'Potion'
        });

        itemDragServiceMock.getSelectedItem.and.returnValue(draggedItem);

        const event = new DragEvent('drop');
        component.onContainerDrop(event, testItem);

        expect(testItem.itemCounter).toBe(2);
        expect(itemDragServiceMock.clearSelection).toHaveBeenCalled();
    });

    it('should prevent default on drag over', () => {
        const event = new DragEvent('dragover');
        spyOn(event, 'preventDefault');
        component.onDragOver(event);
        expect(event.preventDefault).toHaveBeenCalled();
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

});
