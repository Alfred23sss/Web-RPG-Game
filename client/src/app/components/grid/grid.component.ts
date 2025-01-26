import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TileComponent } from '@app/components//tile/tile.component';
import { Tile } from '@app/interfaces/tile';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [TileComponent, CommonModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent {
    // @Input() rows: number;
    // @Input() cols: number;
    @Input() grid: Tile[][] | undefined = [];
}
