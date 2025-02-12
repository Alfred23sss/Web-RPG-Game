import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TileComponent } from '@app/components/tile/tile.component';
import { Tile, TileType } from '@app/interfaces/tile';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [TileComponent, CommonModule, DragDropModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent {
    @Input() grid: Tile[][] | undefined = [];
    tileType = TileType;
}
