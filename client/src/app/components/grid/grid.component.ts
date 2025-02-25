import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TileComponent } from '@app/components/tile/tile.component';
import { TileType } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [TileComponent, CommonModule, DragDropModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent {
    @Input() grid: Tile[][] | undefined = [];
    @Input() availablePath: Tile[] | undefined = [];
    @Input() quickestPath: Tile[] | undefined = [];
    @Output() tileHovered = new EventEmitter<Tile>();
    tileType = TileType;

    isInQuickestPath(tile: Tile): boolean {
        return this.quickestPath ? this.quickestPath.some((t) => t.id === tile.id) : false;
    }

    isAvailablePath(tile: Tile): boolean {
        return this.availablePath ? this.availablePath.some((t) => t.id === tile.id) : false;
    }
}
