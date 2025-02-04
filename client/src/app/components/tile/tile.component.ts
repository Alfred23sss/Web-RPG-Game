import { Component, HostListener, Input } from '@angular/core';
import { Item } from '@app/interfaces/item';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { ToolService } from '@app/services/tool/tool.service';

@Component({
    selector: 'app-tile',
    standalone: true,
    templateUrl: './tile.component.html',
    styleUrls: ['./tile.component.scss'],
})
export class TileComponent {
    static activeButton: number | null = null;
    static isDraggedTest = false;
    activeItem: Item | undefined = undefined;
    @Input() tile!: Tile;

    constructor(
        private toolService: ToolService,
        private itemDragService: ItemDragService,
    ) {}

    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent): void {
        if (TileComponent.activeButton === null) {
            TileComponent.activeButton = event.button;

            if (event.button === 2) {
                if (this.tile.item !== undefined) {
                    this.removeTileObject();
                } else {
                    this.removeTileType();
                }
            } else if (event.button === 0 && !this.tile.item) {
                this.applyTool();
            }
        }
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (TileComponent.activeButton === 0) {
            this.applyTool();
        }
    }

    @HostListener('contextmenu', ['$event'])
    onRightClick(event: MouseEvent): void {
        event.preventDefault();
    }

    @HostListener('document:mouseup', ['$event'])
    onMouseUp(event: MouseEvent): void {
        if (TileComponent.activeButton === event.button) {
            TileComponent.activeButton = null;
        }
        TileComponent.isDraggedTest = false;
    }

    @HostListener('dragover', ['$event'])
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        TileComponent.isDraggedTest = true;
    }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent): void {
        event.preventDefault();
        const draggedItem = this.itemDragService.getSelectedItem();
        const previousTile = this.itemDragService.getPreviousTile();

        if (draggedItem && !this.tile.item && this.tile.type !== TileType.Door && this.tile.type !== TileType.Wall) {
            const clonedItem = draggedItem.clone();
            this.applyItem(clonedItem);
            if (previousTile) {
                previousTile.item = undefined;
            }
            this.itemDragService.clearSelection();
        }
        if (TileComponent.activeButton === event.button) {
            TileComponent.activeButton = null;
        }
        TileComponent.isDraggedTest = false;
    }

    private applyItem(item: Item): void {
        this.tile.item = item;
        this.itemDragService.modifyItemCounter();
    }

    private applyTool(): void {
        if (TileComponent.activeButton !== 0 || TileComponent.isDraggedTest) return;

        const selectedTool = this.toolService.getSelectedTool();
        if (selectedTool && !((selectedTool.tool === TileType.Door || selectedTool.tool === TileType.Wall) && this.tile.item)) {
            if (selectedTool.tool === TileType.Door) {
                if (this.tile.type !== TileType.Door) {
                    this.tile.imageSrc = selectedTool.image;
                    this.tile.type = selectedTool.tool;
                    this.tile.isOpen = false;
                } else {
                    if (!this.tile.item) {
                        this.tile.isOpen = !this.tile.isOpen;
                        this.tile.imageSrc = this.tile.isOpen ? ImageType.OpenDoor : ImageType.ClosedDoor;
                    } else {
                        console.log("You can't open or close a door while an item is on it");
                    }
                }
            } else {
                this.tile.imageSrc = selectedTool.image;
                this.tile.type = selectedTool.tool;
            }
        }
    }

    selectObject(item: Item): void {
        this.itemDragService.setSelectedItem(item, this.tile);
        this.activeItem = this.itemDragService.getSelectedItem();
    }

    private removeTileObject(): void {
        if (this.tile.item) {
            if (this.tile.item.originalReference) {
                this.tile.item.originalReference.itemCounter++;
            }
            this.tile.item = undefined;
        }
    }

    private removeTileType(): void {
        this.tile.imageSrc = ImageType.Default;
        this.tile.type = TileType.Default;
        this.tile.isOpen = false;
    }
}
