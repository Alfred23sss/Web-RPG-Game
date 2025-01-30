import { Component, HostListener, Input } from '@angular/core';
import { Item } from '@app/interfaces/item';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { ToolService } from '@app/services/tool.service';

@Component({
    selector: 'app-tile',
    standalone: true,
    templateUrl: './tile.component.html',
    styleUrls: ['./tile.component.scss'],
})
export class TileComponent {
    static activeButton: number | null = null;
    static doubleClicked = false;
    static isDraggedTest = false; // Flag to track if an item is being dragged
    activeItem: Item | undefined = undefined;
    @Input() tile!: Tile;

    constructor(
        private toolService: ToolService,
        private itemDragService: ItemDragService,
    ) {}

    // Prevent tool application during dragging
    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent): void {
        if (TileComponent.activeButton === null) {
            TileComponent.activeButton = event.button;

            // If dragging, don't apply the tool
            if (TileComponent.isDraggedTest) {
                return;
            }

            if (event.button === 2) {  // Right-click (button 2)
                if (this.tile.item != undefined) {
                    this.removeTileObject();
                } else {
                    this.removeTileType();
                }
            } else if (event.button === 0) {  // Left-click (button 0)
                this.applyTool();
            }
        }
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (TileComponent.activeButton === 0 && !TileComponent.isDraggedTest) {
            this.applyTool();
        } else if (TileComponent.activeButton === 2) {
            if (this.tile.item != undefined) {
                this.removeTileObject();
            } else {
                this.removeTileType();
            }
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
        console.log("Item being dragged");
        event.preventDefault();
        TileComponent.isDraggedTest = true;
    }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent): void {
        event.preventDefault();

        const draggedItem = this.itemDragService.getSelectedItem();

        if (draggedItem && !this.tile.item) {
            const clonedItem = draggedItem.clone();
            this.applyItem(clonedItem);
        }
    }

    private applyItem(item: Item): void {
        console.log('Item applied:', item, this.tile.id);
        this.tile.item = item;
        this.itemDragService.modifyItemCounter();
    }

    private applyTool(): void {
        if (TileComponent.activeButton !== 0 || TileComponent.isDraggedTest) return; // Don't apply tool if dragging

        const selectedTool = this.toolService.getSelectedTool();
        if (selectedTool) {
            if (selectedTool.tool === TileType.Door) {
                if (this.tile.type !== TileType.Door) {
                    this.tile.imageSrc = selectedTool.image;
                    this.tile.type = selectedTool.tool;
                    this.tile.isOpen = false;
                } else {
                    if(!this.tile.item){
                        this.tile.isOpen = !this.tile.isOpen;
                        if (this.tile.isOpen) {
                            this.tile.imageSrc = ImageType.OpenDoor;
                        } else {
                            this.tile.imageSrc = ImageType.ClosedDoor;
                        }}
                    else{
                        console.log("Note: you can't open or close a door while an item is on the door")
                    }
                }
            } else {
                this.tile.imageSrc = selectedTool.image;
                this.tile.type = selectedTool.tool;
            }
        }
    }

    selectObject(item: Item): void {
        this.itemDragService.setSelectedItem(item);
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
