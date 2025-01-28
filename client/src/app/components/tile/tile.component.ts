import { Component, HostListener, Input } from '@angular/core';
import { ItemComponent } from '@app/components/item/item.component';
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
                this.removeTileType();
            } else if (event.button === 0) {
                this.applyTool();
            }
        }
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (TileComponent.activeButton === 0) {
            this.applyTool();
        } else if (TileComponent.activeButton === 2) {
            this.removeTileType();
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
    }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent): void {
        event.preventDefault();
        const selectedItem = this.itemDragService.getSelectedItem();
        if (selectedItem) {
            this.applyItem(selectedItem);
        }
    }

    @HostListener('dragover', ['$event'])
    onDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    private applyItem(item: ItemComponent): void {
        console.log('Item applied:', item, this.tile.id);
        this.itemDragService.modifyItemCounter();
        this.tile.item = this.itemDragService.getSelectedItem();
    }

    private applyTool(): void {
        if (TileComponent.activeButton !== 0) return;

        const selectedTool = this.toolService.getSelectedTool();
        if (selectedTool) {
            if (selectedTool.tool === TileType.Door) {
                if (this.tile.type !== TileType.Door) {
                    this.tile.imageSrc = selectedTool.image;
                    this.tile.type = selectedTool.tool;
                    this.tile.isOpen = false;
                } else {
                    this.tile.isOpen = !this.tile.isOpen;
                    if (this.tile.isOpen) {
                        this.tile.imageSrc = ImageType.OpenDoor;
                    } else {
                        this.tile.imageSrc = ImageType.ClosedDoor;
                    }
                }
            } else {
                this.tile.imageSrc = selectedTool.image;
                this.tile.type = selectedTool.tool;
            }
        }
        // this.printGridServiceTest();
    }

    // private printGridServiceTest() {
    //     const tileTest = this.gridService.getTile(0, 0);
    //     // console.log(tileTest.type);
    //     // console.log('in');
    // }

    private removeTileType(): void {
        this.tile.imageSrc = ImageType.Default;
        this.tile.type = TileType.Default;
        this.tile.isOpen = false;
    }
}
