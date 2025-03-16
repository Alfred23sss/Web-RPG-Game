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

    describe('Non-edition mode', () => {
        beforeEach(() => {
            component.isEditionMode = false;
            fixture.detectChanges();
        });

        it('should ignore mouse interactions', () => {
            const mouseDownEvent = new MouseEvent('mousedown', { button: MouseButton.Left });
            const mouseEnterEvent = new MouseEvent('mouseenter');

            fixture.debugElement.triggerEventHandler('mousedown', mouseDownEvent);
            fixture.debugElement.triggerEventHandler('mouseenter', mouseEnterEvent);

            expect(tileServiceSpy.applyTool).not.toHaveBeenCalled();
            expect(tileServiceSpy.removeTileType).not.toHaveBeenCalled();
        });
    });

    afterEach(() => {
        TileComponent.activeButton = null;
        TileComponent.isDraggedTest = false;
    });
});
