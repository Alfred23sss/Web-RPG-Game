import { Component, HostListener, Input } from '@angular/core';
import { Tile } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/itemDrag/ItemDrag.service';
import { TileService } from '@app/services/tile/tile.service';

@Component({
    selector: 'app-tile',
    standalone: true,
    templateUrl: './tile.component.html',
    styleUrls: ['./tile.component.scss'],
})
export class TileComponent {
    static activeButton: number | null = null;
    static isDraggedTest = false;
    @Input() tile!: Tile;
    constructor(
        private itemDragService: ItemDragService,
        private tileService: TileService,
    ) {
        this.tileService.resetTool();
    }

    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent): void {
        this.itemDragService.setSelectedItem(this.tile.item, this.tile);

        if (TileComponent.activeButton !== null) return;

        TileComponent.activeButton = event.button;

        if (event.button === 2) {
            if (this.tile.item !== undefined) {
                this.tileService.removeTileObject(this.tile);
                TileComponent.activeButton = null;
            } else {
                this.tileService.removeTileType(this.tile);
            }
        } else if (event.button === 0 && !this.tile.item) {
            this.tileService.applyTool(this.tile);
        }
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (TileComponent.activeButton === 0) {
            this.tileService.applyTool(this.tile);
        }
        if (TileComponent.activeButton === 2) {
            this.tileService.removeTileType(this.tile);
        }
    }

    @HostListener('contextmenu', ['$event'])
    onRightClick(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (this.tile.item) {
            this.tileService.removeTileObject(this.tile);
            TileComponent.activeButton = null;
        }
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
        this.tileService.drop(this.tile);
        if (TileComponent.activeButton === event.button) {
            TileComponent.activeButton = null;
        }
        TileComponent.isDraggedTest = false;
    }
}
