import { Component, HostListener, Input } from '@angular/core';
import { Tile } from '@app/interfaces/tile';
import { GridService } from '@app/services/grid-service.service';
import { ToolService } from '@app/services/tool.service';

@Component({
    selector: 'app-tile',
    standalone: true,
    templateUrl: './tile.component.html',
    styleUrls: ['./tile.component.scss'],
})
export class TileComponent {
    static isDragging = false;
    @Input() tile!: Tile;

    constructor(
        private toolService: ToolService,
        private gridService: GridService,
    ) {}

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

    private applyTool(): void {
        const selectedTool = this.toolService.getSelectedTool();
        if (selectedTool) {
            const [row, col] = this.tile.id.split('-').slice(1).map(Number);
            // console.log(this.gridService.getTile(row, col).type);
            this.gridService.updateTile(row, col, {
                imageSrc: selectedTool.image,
                type: selectedTool.tool,
                isOccupied: true,
            });
            // console.log(this.gridService.getTile(row, col).type);
        }
    }
}
