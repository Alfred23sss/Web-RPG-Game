import { TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item';
import { TileComponent } from '@app/components/tile/tile.component';
import { ImageType, ItemDescription, ItemType, Tile, TileType } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { TileService } from '@app/services/tile/Tile.service';
import { ToolService } from '@app/services/tool/tool.service';
import { ItemService } from '../item/item.service';

describe('TileService', () => {
    let service: TileService;
    let toolServiceSpy: jasmine.SpyObj<ToolService>;
    let itemDragServiceSpy: jasmine.SpyObj<ItemDragService>;
    let itemServiceSpy: jasmine.SpyObj<ItemService>;

    beforeEach(() => {
        const toolSpy = jasmine.createSpyObj('ToolService', ['getSelectedTool']);
        const itemDragSpy = jasmine.createSpyObj('ItemDragService', ['getSelectedItem', 'getPreviousTile', 'clearSelection', 'decreaseItemCounter']);
        const itemServiceSpyObj = jasmine.createSpyObj('ItemService', ['incrementItemCounter']);

        TestBed.configureTestingModule({
            providers: [
                TileService,
                { provide: ToolService, useValue: toolSpy },
                { provide: ItemDragService, useValue: itemDragSpy },
                { provide: ItemService, useValue: itemServiceSpyObj },
            ],
        });

        service = TestBed.inject(TileService);
        toolServiceSpy = TestBed.inject(ToolService) as jasmine.SpyObj<ToolService>;
        itemDragServiceSpy = TestBed.inject(ItemDragService) as jasmine.SpyObj<ItemDragService>;
        itemServiceSpy = TestBed.inject(ItemService) as jasmine.SpyObj<ItemService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('applyTool', () => {
        let tile: Tile;
        beforeEach(() => {
            tile = { imageSrc: '', type: TileType.Default, isOpen: false, item: undefined } as Tile;
            TileComponent.isDraggedTest = false;
            TileComponent.activeButton = 0;
        });

        it('should not apply tool if activeButton is not 0', () => {
            TileComponent.activeButton = 1;
            service.applyTool(tile);
            expect(tile.type).toBe(TileType.Default);
        });

        it('should not apply tool if isDraggedTest is true', () => {
            TileComponent.isDraggedTest = true;
            service.applyTool(tile);
            expect(tile.type).toBe(TileType.Default);
        });

        it('should not apply tool if selectedTool is null', () => {
            toolServiceSpy.getSelectedTool.and.returnValue(null);
            service.applyTool(tile);
            expect(tile.type).toBe(TileType.Default);
        });

        it('should not apply tool if selectedTool is door and item is present', () => {
            toolServiceSpy.getSelectedTool.and.returnValue({ tool: TileType.Door, image: ImageType.ClosedDoor });
            tile.item = Object.assign(new Item(), {
                id: '0',
                name: 'lightning',
                imageSrc: ItemType.Lightning,
                imageSrcGrey: ItemType.LightningGray,
                itemCounter: 1,
                description: ItemDescription.Lightning,
            });
            service.applyTool(tile);
            expect(tile.type).toBe(TileType.Default);
        });

        it('should apply closedDoor if selectedTool is door and tile is not door', () => {
            toolServiceSpy.getSelectedTool.and.returnValue({ tool: TileType.Door, image: ImageType.ClosedDoor });
            service.applyTool(tile);
            expect(tile.type).toBe(TileType.Door);
            expect(tile.imageSrc).toBe(ImageType.ClosedDoor);
        });

        it('should change door to open if selectedTool is door and tile is closed door', () => {
            toolServiceSpy.getSelectedTool.and.returnValue({ tool: TileType.Door, image: ImageType.ClosedDoor });
            tile.type = TileType.Door;
            service.applyTool(tile);
            expect(tile.type).toBe(TileType.Door);
            expect(tile.imageSrc).toBe(ImageType.OpenDoor);
            expect(tile.isOpen).toBe(true);
        });

        it('should change door to open if selectedTool is door and tile is closed door', () => {
            toolServiceSpy.getSelectedTool.and.returnValue({ tool: TileType.Door, image: ImageType.ClosedDoor });
            tile.type = TileType.Door;
            tile.isOpen = true;
            service.applyTool(tile);
            expect(tile.type).toBe(TileType.Door);
            expect(tile.imageSrc).toBe(ImageType.ClosedDoor);
            expect(tile.isOpen).toBe(false);
        });

        it('should apply tool if conditions are met', () => {
            toolServiceSpy.getSelectedTool.and.returnValue({ tool: TileType.Wall, image: ImageType.Wall });
            service.applyTool(tile);
            expect(tile.type).toBe(TileType.Wall);
            expect(tile.imageSrc).toBe(ImageType.Wall);
        });
    });

    describe('removeTileObject', () => {
        it('should remove item from tile and increment item counter', () => {
            const tile: Tile = { item: { name: 'item1' } as Item } as Tile;
            service.removeTileObject(tile);
            expect(tile.item).toBeUndefined();
            expect(itemServiceSpy.incrementItemCounter).toHaveBeenCalledWith('item1');
        });
    });

    describe('removeTileType', () => {
        it('should reset tile type and image', () => {
            const tile: Tile = { type: TileType.Wall, imageSrc: 'wall.png', isOpen: true } as Tile;
            service.removeTileType(tile);
            expect(tile.type).toBe(TileType.Default);
            expect(tile.imageSrc).toBe(ImageType.Default);
            expect(tile.isOpen).toBeFalse();
        });
    });

    describe('drop', () => {
        it('should apply item to tile and clear previous tile', () => {
            const tile: Tile = { type: TileType.Default } as Tile;
            const previousTile: Tile = { item: { name: 'item1' } as Item } as Tile;
            const draggedItem = { clone: jasmine.createSpy().and.returnValue({ name: 'item1' }) } as unknown as Item;

            itemDragServiceSpy.getSelectedItem.and.returnValue(draggedItem);
            itemDragServiceSpy.getPreviousTile.and.returnValue(previousTile);

            service.drop(tile);

            expect(tile.item).toEqual(jasmine.objectContaining({ name: 'item1' }));
            expect(previousTile.item).toBeUndefined();
            expect(itemDragServiceSpy.clearSelection).toHaveBeenCalled();
        });

        it('should not apply item to tile if draggedItem is undefined', () => {
            const tile: Tile = { type: TileType.Default } as Tile;
            const previousTile: Tile = { item: { name: 'item1' } as Item } as Tile;
            const draggedItem = undefined;

            itemDragServiceSpy.getSelectedItem.and.returnValue(draggedItem);
            itemDragServiceSpy.getPreviousTile.and.returnValue(previousTile);

            service.drop(tile);

            expect(tile.item).toBeUndefined();
            expect(previousTile.item).toEqual(jasmine.objectContaining({ name: 'item1' }));
        });
    });
});
