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
    @Input() isEditionMode: boolean = false;

    @Output() tileHovered = new EventEmitter<Tile>();
    @Output() tileClicked = new EventEmitter<Tile>();
    @Output() playerAttacked = new EventEmitter<Tile>();
    @Output() doorClicked = new EventEmitter<Tile>();
    @Output() tileRightClicked = new EventEmitter<{ tile: Tile; event: MouseEvent }>();

    tileType = TileType;

    isInQuickestPath(tile: Tile): boolean {
        return this.quickestPath ? this.quickestPath.some((t) => t.id === tile.id) : false;
    }

    isAvailablePath(tile: Tile): boolean {
        return this.availablePath ? this.availablePath.some((t) => t.id === tile.id) : false;
    }

    onTileClick(tile: Tile): void {
        if (tile.player) {
            this.playerAttacked.emit(tile);
        } else if (tile.type === TileType.Door) {
            this.doorClicked.emit(tile);
        } else if (this.isAvailablePath(tile)) {
            this.tileClicked.emit(tile);
        }
    }

    onTileRightClick(event: MouseEvent, tile: Tile): void {
        event.preventDefault();
        this.tileRightClicked.emit({ tile, event });
    }
}
