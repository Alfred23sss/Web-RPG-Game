import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item';
import { ImageType, ItemDescription, ItemType, MouseButton, TileType } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/item-drag/Item-drag.service';
import { TileService } from '@app/services/tile/tile.service';
import { TileComponent } from './tile.component';

describe('TileComponent', () => {
    let component: TileComponent;
    let fixture: ComponentFixture<TileComponent>;
    let tileServiceSpy: jasmine.SpyObj<TileService>;
    let itemDragServiceSpy: jasmine.SpyObj<ItemDragService>;
    let mockTile: Tile;

    beforeEach(async () => {
        tileServiceSpy = jasmine.createSpyObj('TileService', ['removeTileObject', 'removeTileType', 'applyTool', 'drop', 'resetTool']);
        itemDragServiceSpy = jasmine.createSpyObj('ItemDragService', ['setSelectedItem']);

        await TestBed.configureTestingModule({
            imports: [TileComponent],
            providers: [
                { provide: TileService, useValue: tileServiceSpy },
                { provide: ItemDragService, useValue: itemDragServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TileComponent);
        component = fixture.componentInstance;

        TileComponent.activeButton = null;
        TileComponent.isDraggedTest = false;

        mockTile = {
            id: 'test_id',
            type: TileType.Default,
            imageSrc: ImageType.Default,
            isOpen: true,
            isOccupied: false,
            item: undefined,
        };

        component.tile = mockTile;
        component.isEditionMode = true;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('mousedown', () => {
        it('should handle right click removal with item', () => {
            component.tile.item = new Item({
                id: '0',
                name: 'lightning',
                imageSrc: ItemType.Lightning,
                imageSrcGrey: ItemType.LightningGray,
                itemCounter: 1,
                description: ItemDescription.Lightning,
            });

            spyOn(component.tile.item, 'clone').and.callThrough();
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // necessary because generateUniqueId is private
            spyOn(component.tile.item as any, 'generateUniqueId').and.callThrough();

            const event = new MouseEvent('mousedown', { button: MouseButton.Right });
            fixture.debugElement.triggerEventHandler('mousedown', event);

            expect(tileServiceSpy.removeTileObject).toHaveBeenCalledWith(mockTile);
        });

        it('should handle right click removal without item', () => {
            const event = new MouseEvent('mousedown', { button: MouseButton.Right });
            fixture.debugElement.triggerEventHandler('mousedown', event);

            expect(tileServiceSpy.removeTileType).toHaveBeenCalledWith(mockTile);
        });

        it('should apply tool on left click', () => {
            const event = new MouseEvent('mousedown', { button: MouseButton.Left });
            fixture.debugElement.triggerEventHandler('mousedown', event);

            expect(tileServiceSpy.applyTool).toHaveBeenCalledWith(mockTile);
        });

        it('should exit early when activeButton is already set', () => {
            TileComponent.activeButton = MouseButton.Right;

            const event = new MouseEvent('mousedown', {
                button: MouseButton.Left,
            });

            fixture.debugElement.triggerEventHandler('mousedown', event);

            expect(itemDragServiceSpy.setSelectedItem).toHaveBeenCalledWith(component.tile.item, component.tile);
            expect(TileComponent.activeButton).toBe(MouseButton.Right);
            expect(tileServiceSpy.applyTool).not.toHaveBeenCalled();
            expect(tileServiceSpy.removeTileObject).not.toHaveBeenCalled();
            expect(tileServiceSpy.removeTileType).not.toHaveBeenCalled();
        });
    });

    it('should prevent default context menu', () => {
        const event = new MouseEvent('contextmenu');
        spyOn(event, 'preventDefault');
        component.onRightClick(event);

        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle mouse enter with left button active', () => {
        TileComponent.activeButton = MouseButton.Left;
        fixture.debugElement.triggerEventHandler('mouseenter', {});

        expect(tileServiceSpy.applyTool).toHaveBeenCalledWith(mockTile);
    });

    it('should handle mouse enter with right button active', () => {
        TileComponent.activeButton = MouseButton.Right;
        fixture.debugElement.triggerEventHandler('mouseenter', {});

        expect(tileServiceSpy.removeTileType).toHaveBeenCalledWith(mockTile);
    });

    it('should handle drop event', () => {
        const event = new DragEvent('drop');
        fixture.debugElement.triggerEventHandler('drop', event);

        expect(tileServiceSpy.drop).toHaveBeenCalledWith(mockTile);
    });

    it('should reset active button when matching event button', () => {
        const mockEvent = new DragEvent('drop');
        Object.defineProperty(mockEvent, 'button', { value: MouseButton.Left });
        TileComponent.activeButton = MouseButton.Left;
        component.onDrop(mockEvent);

        expect(TileComponent.activeButton).toBeNull();
        expect(tileServiceSpy.drop).toHaveBeenCalledWith(mockTile);
        expect(TileComponent.isDraggedTest).toBeFalse();
    });

    describe('Non-edition mode', () => {
        beforeEach(() => {
            component.isEditionMode = false;
            fixture.detectChanges();
        });

        it('should ignore mouse interactions', () => {
            const mouseDownEvent = new MouseEvent('mousedown', { button: MouseButton.Left });
            const mouseEnterEvent = new MouseEvent('mouseenter');
            const mouseRightClick = new MouseEvent('contextmenu');
            const mouseOnDrop = new MouseEvent('drop');

            fixture.debugElement.triggerEventHandler('mousedown', mouseDownEvent);
            fixture.debugElement.triggerEventHandler('mouseenter', mouseEnterEvent);
            fixture.debugElement.triggerEventHandler('contextmenu', mouseRightClick);
            fixture.debugElement.triggerEventHandler('drop', mouseOnDrop);

            expect(tileServiceSpy.applyTool).not.toHaveBeenCalled();
            expect(tileServiceSpy.removeTileType).not.toHaveBeenCalled();
            expect(tileServiceSpy.removeTileObject).not.toHaveBeenCalled();
            expect(tileServiceSpy.drop).not.toHaveBeenCalled();
        });

        it('should not modify for mouse up', () => {
            TileComponent.activeButton = MouseButton.Left;
            TileComponent.isDraggedTest = true;
            const event = { button: MouseButton.Left } as MouseEvent;

            component.onMouseUp(event);

            expect(TileComponent.activeButton).toBe(MouseButton.Left);
            expect(TileComponent.isDraggedTest).toBeTrue();
        });
    });

    describe('onRightClick() with item', () => {
        it('should remove tile object and reset active button', () => {
            component.tile.item = new Item({
                id: '1',
                name: 'test-item',
                imageSrc: 'item.png',
                itemCounter: 1,
                description: 'Test item',
            });

            const event = new MouseEvent('contextmenu');
            spyOn(event, 'preventDefault');
            spyOn(event, 'stopPropagation');

            component.onRightClick(event);

            expect(tileServiceSpy.removeTileObject).toHaveBeenCalledWith(mockTile);
            expect(TileComponent.activeButton).toBeNull();
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
        });
    });

    describe('onDragOver()', () => {
        it('should handle drag over in edition mode', () => {
            const event = new DragEvent('dragover');
            spyOn(event, 'preventDefault');

            component.onDragOver(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(TileComponent.isDraggedTest).toBeTrue();
        });

        it('should ignore drag over outside edition mode', () => {
            component.isEditionMode = false;
            const event = new DragEvent('dragover');

            component.onDragOver(event);

            expect(TileComponent.isDraggedTest).toBeFalse();
        });
    });

    describe('onMouseUp()', () => {
        it('should reset active button and dragged state when button matches', () => {
            TileComponent.activeButton = MouseButton.Left;
            TileComponent.isDraggedTest = true;
            const event = { button: MouseButton.Left } as MouseEvent;

            component.onMouseUp(event);

            expect(TileComponent.activeButton).toBeNull();
            expect(TileComponent.isDraggedTest).toBeFalse();
        });

        it('should only reset dragged state when button does not match', () => {
            TileComponent.activeButton = MouseButton.Right;
            TileComponent.isDraggedTest = true;
            const event = { button: MouseButton.Left } as MouseEvent;

            component.onMouseUp(event);

            expect(TileComponent.activeButton).toBe(MouseButton.Right);
            expect(TileComponent.isDraggedTest).toBeFalse();
        });

        it('should not modify state when not in edition mode', () => {
            component.isEditionMode = false;
            TileComponent.activeButton = MouseButton.Left;
            TileComponent.isDraggedTest = true;
            const event = { button: MouseButton.Left } as MouseEvent;

            component.onMouseUp(event);

            expect(TileComponent.activeButton).toBe(MouseButton.Left);
            expect(TileComponent.isDraggedTest).toBeTrue();
        });
    });

    afterEach(() => {
        TileComponent.activeButton = null;
        TileComponent.isDraggedTest = false;
    });
});
