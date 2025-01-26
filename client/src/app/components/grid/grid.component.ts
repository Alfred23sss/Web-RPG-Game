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
    drop(event: CdkDragDrop<ItemComponent[]>): void {
        console.log(event);
      }
}

