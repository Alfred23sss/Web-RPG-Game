import { Injectable } from '@angular/core';
import { TileComponent } from '@app/components/tile/tile.component';
import { Item } from '@app/interfaces/item';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { ToolService } from '@app/services/tool/tool.service';

@Injectable({
    providedIn: 'root',
})
export class TileService {
    constructor(
        private toolService: ToolService,
        private itemDragService: ItemDragService,
    ) {}

    applyTool(tile: Tile): void {
        if (TileComponent.activeButton !== 0 || TileComponent.isDraggedTest) return;

        const selectedTool = this.toolService.getSelectedTool();
        if (selectedTool && !((selectedTool.tool === TileType.Door || selectedTool.tool === TileType.Wall) && tile.item)) {
            if (selectedTool.tool === TileType.Door) {
                if (tile.type !== TileType.Door) {
                    tile.imageSrc = selectedTool.image;
                    tile.type = selectedTool.tool;
                    tile.isOpen = false;
                } else {
                    if (!tile.item) {
                        tile.isOpen = !tile.isOpen;
                        tile.imageSrc = tile.isOpen ? ImageType.OpenDoor : ImageType.ClosedDoor;
                    }
                }
            } else {
                tile.imageSrc = selectedTool.image;
                tile.type = selectedTool.tool;
            }
        }
    }

    removeTileObject(tile: Tile): void {
        if (tile.item) {
            if (tile.item.originalReference) {
                tile.item.originalReference.itemCounter++;
            }
            tile.item = undefined;
        }
    }

    removeTileType(tile: Tile): void {
        tile.imageSrc = ImageType.Default;
        tile.type = TileType.Default;
        tile.isOpen = false;
    }

    drop(tile: Tile): void {
        const draggedItem = this.itemDragService.getSelectedItem();
        const previousTile = this.itemDragService.getPreviousTile();

        if (draggedItem && !tile.item && tile.type !== TileType.Door && tile.type !== TileType.Wall) {
            const clonedItem = draggedItem.clone();
            this.applyItem(tile, clonedItem);
            if (previousTile) {
                previousTile.item = undefined;
            }
            this.itemDragService.clearSelection();
        }
    }

    private applyItem(tile: Tile, item: Item): void {
        tile.item = item;
        this.itemDragService.modifyItemCounter();
    }
}
