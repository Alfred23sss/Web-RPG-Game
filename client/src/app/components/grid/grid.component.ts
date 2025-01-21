import { Component, Input, OnInit } from '@angular/core';
import { TileComponent } from '../tile/tile.component';
import { CommonModule } from '@angular/common';

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
    grid: { id: string; imageSrc: string; isOccupied: boolean; type: string; isOpen: boolean }[][] = [];

    ngOnInit() {
        this.grid = this.generateGrid(this.rows, this.cols);
    }

    private generateGrid(rows: number, cols: number): any[][] {
        return Array.from({ length: rows }, (_, rowIndex) =>
            Array.from({ length: cols }, (_, colIndex) => ({
                id: `tile-${rowIndex}-${colIndex}`,
                imageSrc: 'assets/images/clay.png',
                isOccupied: false,
                type: 'default',
                isOpen: true,
            })),
        );
    }
}
