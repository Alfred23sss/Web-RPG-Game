import { Component, HostListener, Input } from '@angular/core';
import { ItemName, ItemType, MouseButton } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/item-drag/Item-drag.service';
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
    @Input() isEditionMode: boolean = false;

    constructor(
        private itemDragService: ItemDragService,
        private tileService: TileService,
    ) {
        this.tileService.resetTool();
    }

    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent): void {
        if (!this.isEditionMode) return;
        this.itemDragService.setSelectedItem(this.tile.item, this.tile);

        if (TileComponent.activeButton !== null) return;

        TileComponent.activeButton = event.button;

        if (event.button === MouseButton.Right) {
            if (this.tile.item) {
                this.tileService.removeTileObject(this.tile);
                TileComponent.activeButton = null;
            } else {
                this.tileService.removeTileType(this.tile);
            }
        } else if (event.button === MouseButton.Left && !this.tile.item) {
            this.tileService.applyTool(this.tile);
        }
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (!this.isEditionMode) return;

        if (TileComponent.activeButton === MouseButton.Left) {
            this.tileService.applyTool(this.tile);
        }
        if (TileComponent.activeButton === MouseButton.Right) {
            this.tileService.removeTileType(this.tile);
        }
    }

    @HostListener('contextmenu', ['$event'])
    onRightClick(event: MouseEvent): void {
        if (!this.isEditionMode) return;
        event.preventDefault();
        event.stopPropagation();
        if (this.tile.item) {
            this.tileService.removeTileObject(this.tile);
            TileComponent.activeButton = null;
        }
    }

    @HostListener('document:mouseup', ['$event'])
    onMouseUp(event: MouseEvent): void {
        if (!this.isEditionMode) return;
        if (TileComponent.activeButton === event.button) {
            TileComponent.activeButton = null;
        }
        TileComponent.isDraggedTest = false;
    }

    @HostListener('dragover', ['$event'])
    onDragOver(event: DragEvent): void {
        if (!this.isEditionMode) return;
        event.preventDefault();
        TileComponent.isDraggedTest = true;
    }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent): void {
        if (!this.isEditionMode) return;
        event.preventDefault();
        this.tileService.drop(this.tile);
        if (TileComponent.activeButton === event.button) {
            TileComponent.activeButton = null;
        }
        TileComponent.isDraggedTest = false;
    }

    hasFlagInInventory(): boolean {
        if (!this.tile?.player?.inventory) return false;

        return this.tile.player.inventory.some((item) => item !== null && item.name === ItemName.Flag);
    }

    getFlagImage(): string {
        if (!this.tile?.player?.inventory) return '';

        const flagItem = this.tile.player.inventory.find((item) => item !== null && item.name === ItemName.Flag);

        return flagItem?.imageSrc || ItemType.Flag;
    }
}
