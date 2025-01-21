import { Component, HostListener } from '@angular/core';
import { Tile } from '@app/interfaces/tile';
import { ToolService } from '@app/services/tool.service';

@Component({
    selector: 'app-tile',
    standalone: true,
    templateUrl: './tile.component.html',
    styleUrls: ['./tile.component.scss'],
})
export class TileComponent {
    static isDragging = false;
    private tile: Tile;

    constructor(private toolService: ToolService) {}

    @HostListener('mousedown')
    onMouseDown(): void {
        TileComponent.isDragging = true;
        this.applyTool();
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (TileComponent.isDragging) {
            this.applyTool();
        }
    }

    @HostListener('document:mouseup')
    onMouseUp(): void {
        TileComponent.isDragging = false;
    }
    applyTool(): void {
        const selectedTool = this.toolService.getSelectedTool();
        if (selectedTool) {
            this.tile.img = selectedTool.image;
            this.tile.type = selectedTool.tool;
            this.tile.isOccupied = true;
        }
    }
}
