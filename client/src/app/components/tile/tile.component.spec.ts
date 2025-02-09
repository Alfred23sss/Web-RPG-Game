import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImageType, ItemDescription, ItemType, Tile, TileType } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { TileService } from '@app/services/tile/Tile.service';
import { TileComponent } from './tile.component';

describe('TileComponent', () => {
    let component: TileComponent;
    let fixture: ComponentFixture<TileComponent>;
    let tileServiceSpy: jasmine.SpyObj<TileService>;
    let itemDragServiceSpy: jasmine.SpyObj<ItemDragService>;
    let mockTile: Tile;

    beforeEach(async () => {
        tileServiceSpy = jasmine.createSpyObj('TileService', ['removeTileObject', 'removeTileType', 'applyTool', 'drop']);
        itemDragServiceSpy = jasmine.createSpyObj('ItemDragService', ['setSelectedItem']);

        await TestBed.configureTestingModule({
            imports: [TileComponent], // Correction : TileComponent doit être dans imports car c'est un standalone component
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

    it('should call selectObject when overlay image is clicked', () => {
        const overlayImage = fixture.debugElement.query(By.css('.overlay-image'));
        overlayImage.triggerEventHandler('mousedown', {});
        expect(itemDragServiceSpy.setSelectedItem).toHaveBeenCalledWith(mockTile.item, mockTile);
    });

    it('should call applyTool on left click if no item is present', () => {
        component.tile.item = undefined;
        component.onMouseDown(new MouseEvent('mousedown', { button: 0 }));
        expect(tileServiceSpy.applyTool).toHaveBeenCalledWith(mockTile);
    });

    it('should remove tile object on right click if item is present', () => {
        component.onMouseDown(new MouseEvent('mousedown', { button: 2 }));
        expect(tileServiceSpy.removeTileObject).toHaveBeenCalledWith(mockTile);
    });

    it('should remove tile type on right click if no item is present', () => {
        component.tile.item = undefined;
        component.onMouseDown(new MouseEvent('mousedown', { button: 2 }));
        expect(tileServiceSpy.removeTileType).toHaveBeenCalledWith(mockTile);
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
});
