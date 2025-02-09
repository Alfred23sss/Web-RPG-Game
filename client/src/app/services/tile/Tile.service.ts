import { Injectable } from '@angular/core';
import { TileComponent } from '@app/components/tile/tile.component';
import { Item } from '@app/interfaces/item';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { ToolService } from '@app/services/tool/tool.service';
import { ItemService } from '@app/services/item/item.service';

@Injectable({
    providedIn: 'root',
})
export class TileService {
    constructor(
        private toolService: ToolService,
        private itemDragService: ItemDragService,
        private itemService: ItemService,
    ) {}

    applyTool(tile: Tile): void {
        if (TileComponent.activeButton !== 0 || TileComponent.isDraggedTest) return;

        const selectedTool = this.toolService.getSelectedTool();
        if (!selectedTool) return;
        if ((selectedTool.tool === TileType.Door || selectedTool.tool === TileType.Wall) && tile.item) return;

        if (selectedTool.tool === TileType.Door) {
            this.handleDoor(tile);
        } else {
            tile.imageSrc = selectedTool.image;
            tile.type = selectedTool.tool;
        }
    }

    removeTileObject(tile: Tile): void {
        if (tile.item) {
            this.itemService.incrementItemCounter(tile.item.name);
            tile.item = undefined;
        }
    }

    removeTileType(tile: Tile): void {
        tile.imageSrc = ImageType.Default;
        tile.type = TileType.Default;
        tile.isOpen = false;
    }

    drop(tile: Tile): void {
        let draggedItem = this.itemDragService.getSelectedItem();
        const previousTile = this.itemDragService.getPreviousTile();
        if (!(draggedItem && !tile.item && tile.type !== TileType.Door && tile.type !== TileType.Wall)) return;

        if (typeof draggedItem.clone !== 'function') {
            draggedItem = new Item(draggedItem);
        }

        const clonedItem = draggedItem.clone();
        this.applyItem(tile, clonedItem);
        if (previousTile) {
            previousTile.item = undefined;
        }
        this.itemDragService.clearSelection();
    }

    private handleDoor(tile: Tile) {
        if (tile.type !== TileType.Door) {
            tile.imageSrc = ImageType.ClosedDoor;
            tile.type = TileType.Door;
            tile.isOpen = false;
        } else {
            tile.isOpen = !tile.isOpen;
            tile.imageSrc = tile.isOpen ? ImageType.OpenDoor : ImageType.ClosedDoor;
        }
    }

    private applyItem(tile: Tile, item: Item): void {
        tile.item = item;
        this.itemDragService.decreaseItemCounter();
    }
}
