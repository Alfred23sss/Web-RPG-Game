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
    @Input() rows: number = 10; // Comment lutiliser: <app-grid [rows]="10" [cols]="10"></app-grid>
    @Input() cols: number = 10; // Comment lutiliser: <app-grid [rows]="10" [cols]="10"></app-grid>
    grid: TileComponent[][] = [];

    ngOnInit() {
        this.grid = this.generateGrid(this.rows, this.cols); //ngOnInit() appele apres la construction du component
    }

    private generateGrid(rows: number, cols: number): TileComponent[][] {
        return Array.from({ length: rows }, (_, rowIndex) =>
            Array.from({ length: cols }, (_, colIndex) => {
                const tile = new TileComponent();
                tile.id = `tile-${rowIndex}-${colIndex}`;
                tile.imageSrc = '';
                tile.isOccupied = false;
                tile.type = 'default';
                tile.isOpen = true;
                return tile;
            }),
        );
    }
}
