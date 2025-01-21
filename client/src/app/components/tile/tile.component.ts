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
    @Input() imageSrc: string = `assets/images/clay.png`;
    @Input() isOccupied: boolean = false;
    @Input() type: string = 'default';
    @Input() isOpen: boolean = true;

    static isDragging = false;

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
        this.imageSrc = `assets/images/clay.png`;
        this.type = 'default';
        this.isOccupied = false;
    }

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

    @HostListener('contextmenu', ['$event'])
    onRightClick(event: MouseEvent): void {
        event.preventDefault();
        this.resetTile();
    }
}
