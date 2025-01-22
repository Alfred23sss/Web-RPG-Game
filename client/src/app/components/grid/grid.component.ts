import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Tile } from '@app/interfaces/tile';
import { GridService } from '@app/services/grid-service.service';
import { TileComponent } from '../tile/tile.component';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [TileComponent, CommonModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit {
    @Input() rows: number = 10;
    @Input() cols: number = 10;
    grid: Tile[][] = [];

    constructor(private gridService: GridService) {}

    ngOnInit() {
        this.gridService.initializeGrid(this.rows, this.cols);
        this.grid = this.gridService.getGrid();
    }
}
