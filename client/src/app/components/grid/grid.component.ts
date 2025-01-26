import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TileComponent } from '@app/components//tile/tile.component';
import { Tile } from '@app/interfaces/tile';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ItemComponent } from '../item/item.component';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [TileComponent, CommonModule, DragDropModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent {
    // @Input() rows: number;
    // @Input() cols: number;
    @Input() grid: Tile[][] | undefined = [];
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

    drop(event: CdkDragDrop<ItemComponent[]>): void {
        console.log(event);
      }
}
