import { Component, Input, HostListener } from '@angular/core';
import { ToolService } from '@app/services/tool.service';

@Component({
    selector: 'app-tile',
    standalone: true,
    templateUrl: './tile.component.html',
    styleUrls: ['./tile.component.scss'],
})
export class TileComponent {
    @Input() id: string = '';
    @Input() imageSrc: string = 'assets/images/clay.png'; // Corrected asset path
    @Input() isOccupied: boolean = false;
    @Input() type: string = 'default';
    @Input() isOpen: boolean = true;

    static isDragging = false;
    static isRightClickDown = false; // Track if right-click is held down

    constructor(private toolService: ToolService) {}

    applyTool(): void {
        const selectedTool = this.toolService.getSelectedTool();
        if (selectedTool) {
            this.imageSrc = selectedTool.image;
            this.type = selectedTool.tool;
            this.isOccupied = true;
        }
    }

    resetTile(): void {
        this.imageSrc = 'assets/images/clay.png'; // Corrected asset path
        this.type = 'default';
        this.isOccupied = false;
    }

    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent): void {
        if (event.button === 0) {
            // Left-click
            TileComponent.isDragging = true;
            this.applyTool();
        } else if (event.button === 2) {
            // Right-click
            TileComponent.isRightClickDown = true;
            this.resetTile();
        }
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (TileComponent.isDragging && !TileComponent.isRightClickDown) {
            this.applyTool();
        } else if (TileComponent.isRightClickDown) {
            this.resetTile(); // Reset tile if right-click is held and dragging
        }
    }

    @HostListener('document:mouseup')
    onMouseUp(): void {
        TileComponent.isDragging = false;
        TileComponent.isRightClickDown = false; // Reset right-click status
    }

    @HostListener('contextmenu', ['$event'])
    onRightClick(event: MouseEvent): void {
        event.preventDefault(); // Prevent the default context menu
    }
}
