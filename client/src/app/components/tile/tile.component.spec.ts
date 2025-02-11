import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImageType, ItemDescription, ItemType, Tile, TileType } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/itemDrag/ItemDrag.service';
import { TileService } from '@app/services/tile/Tile.service';
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
        TileComponent.activeButton = null;
        TileComponent.isDraggedTest = false;

        await TestBed.configureTestingModule({
            imports: [TileComponent],
            providers: [
                { provide: TileService, useValue: tileServiceSpy },
                { provide: ItemDragService, useValue: itemDragServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TileComponent);
        component = fixture.componentInstance;
        mockTile = {
            id: 'test_id',
            type: TileType.Ice,
            imageSrc: ImageType.Default,
            isOpen: false,
            isOccupied: false,
            item: {
                id: '0',
                name: 'lightning',
                imageSrc: ItemType.Lightning,
                imageSrcGrey: ItemType.LightningGray,
                itemCounter: 1,
                description: ItemDescription.Lightning,
            },
        } as Tile;
        component.tile = mockTile;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should find the tile element', () => {
        const tileElement = fixture.debugElement.query(By.css('.image-container'));
        expect(tileElement).toBeTruthy();
    });

    it('should remove tile object on right click if item is present', () => {
        const tileElement = fixture.debugElement.nativeElement;
        const event = new MouseEvent('mousedown', { button: 2, bubbles: true });

        tileElement.dispatchEvent(event);
        fixture.detectChanges();

        expect(tileServiceSpy.removeTileObject).toHaveBeenCalledWith(mockTile);
    });

    it('should remove tile type on right click if no item is present', () => {
        component.tile.item = undefined;
        const tileElement = fixture.debugElement.nativeElement;
        const event = new MouseEvent('mousedown', { button: 2, bubbles: true });

        tileElement.dispatchEvent(event);
        fixture.detectChanges();

        expect(tileServiceSpy.removeTileType).toHaveBeenCalledWith(mockTile);
    });

    it('should call applyTool on left click if no item is present', () => {
        component.tile.item = undefined;
        const tileElement = fixture.debugElement.nativeElement;
        const event = new MouseEvent('mousedown', { button: 0, bubbles: true });

        tileElement.dispatchEvent(event);
        fixture.detectChanges();

        expect(tileServiceSpy.applyTool).toHaveBeenCalledWith(mockTile);
    });

    it('should prevent context menu from opening', () => {
        const event = new MouseEvent('contextmenu');
        spyOn(event, 'preventDefault');
        component.onRightClick(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should reset activeButton on mouseup', () => {
        TileComponent.activeButton = 0;
        component.onMouseUp(new MouseEvent('mouseup', { button: 0 }));
        expect(TileComponent.activeButton).toBeNull();
    });

    it('should set isDraggedTest to true on drag over', () => {
        component.onDragOver(new DragEvent('dragover'));
        expect(TileComponent.isDraggedTest).toBeTrue();
    });

    it('should call drop on drop event', () => {
        component.onDrop(new DragEvent('drop'));
        expect(tileServiceSpy.drop).toHaveBeenCalledWith(mockTile);
    });

    it('should call applyTool on mouse enter if activeButton is 0', () => {
        TileComponent.activeButton = 0;
        const tileElement = fixture.debugElement.nativeElement;

        tileElement.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        expect(tileServiceSpy.applyTool).toHaveBeenCalledWith(mockTile);
    });

    it('should call removeTileType on mouse enter if activeButton is 2', () => {
        TileComponent.activeButton = 2;

        const tileElement = fixture.debugElement.nativeElement;
        tileElement.dispatchEvent(new MouseEvent('mouseenter'));

        fixture.detectChanges();

        expect(tileServiceSpy.removeTileType).toHaveBeenCalledWith(mockTile);
    });

    it('should reset activeButton on drop if event.button matches activeButton', () => {
        TileComponent.activeButton = 0;

        const event = new DragEvent('drop', { button: 0 });

        component.onDrop(event);

        expect(TileComponent.activeButton).toBeNull();
    });
});
