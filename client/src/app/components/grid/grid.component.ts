import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Tile } from '@app/interfaces/tile';
import { GridService } from '@app/services/grid.service';
import { Game } from '@app/interfaces/game';
// import { TileComponent } from '../tile/tile.component';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit {
    grid: Tile[][] = [];
    game: Game;

    constructor(private gridService: GridService) {}

    ngOnInit() {
        this.grid = 
    }

}
