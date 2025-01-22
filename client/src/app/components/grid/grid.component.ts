import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Tile } from '@app/interfaces/tile';
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

    ngOnInit() {
        this.grid = this.generateGrid(this.rows, this.cols);
    }

    private generateGrid(rows: number, cols: number): Tile[][] {
        return Array.from({ length: rows }, (_, rowIndex) =>
            Array.from(
                { length: cols },
                (_, colIndex): Tile => ({
                    id: `tile-${rowIndex}-${colIndex}`,
                    imageSrc: 'assets/images/clay.png',
                    isOccupied: false,
                    type: 'default',
                    isOpen: true,
                }),
            ),
        );
    }
}
