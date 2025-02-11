import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
import { TileComponent } from '@app/components/tile/tile.component';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';
import { ItemService } from '@app/services/item/item.service';
import { ItemDragService } from '@app/services/itemDrag/ItemDrag.service';
import { ToolService } from '@app/services/tool/tool.service';

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
        if (selectedTool.tool === TileType.Default) return;
        if ((selectedTool.tool === TileType.Door || selectedTool.tool === TileType.Wall) && tile.item) return;

        if (selectedTool.tool === TileType.Door) {
            this.handleDoor(tile);
        } else {
            if (selectedTool.tool === tile.type) return;
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
        let draggedItem = new Item(this.itemDragService.getSelectedItem());
        const previousTile = this.itemDragService.getPreviousTile();
        if (!(draggedItem && !tile.item && tile.type !== TileType.Door && tile.type !== TileType.Wall)) return;

        const clonedItem = draggedItem.clone();
        this.applyItem(tile, clonedItem);
        if (previousTile) {
            previousTile.item = undefined;
        }
        this.itemDragService.clearSelection();
    }

    resetTool() {
        this.toolService.setSelectedTool(TileType.Default, ImageType.Default);
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
