import { Component, HostListener, Input } from '@angular/core';
import { ImageType, Tile, TileType } from '@app/interfaces/tile';
import { GridService } from '@app/services/grid-service.service';
import { ToolService } from '@app/services/tool.service';

@Component({
    selector: 'app-tile',
    standalone: true,
    templateUrl: './tile.component.html',
    styleUrls: ['./tile.component.scss'],
})
export class TileComponent {
    static activeButton: number | null = null;
    @Input() tile!: Tile;

    constructor(
        private toolService: ToolService,
        private gridService: GridService,
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

    private applyTool(): void {
        if (TileComponent.activeButton !== 0) return;

        const selectedTool = this.toolService.getSelectedTool();
        if (selectedTool) {
            const [row, col] = this.tile.id.split('-').slice(1).map(Number);
            this.gridService.updateTile(row, col, {
                imageSrc: selectedTool.image,
                type: selectedTool.tool,
            });
        }
    }

    private removeTileType(): void {
        if (TileComponent.activeButton !== 2) return;

        const [row, col] = this.tile.id.split('-').slice(1).map(Number);
        this.gridService.updateTile(row, col, {
            imageSrc: ImageType.Default,
            type: TileType.Default,
        });
    }
}
