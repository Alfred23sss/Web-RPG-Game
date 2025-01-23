import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TileComponent } from '@app/components//tile/tile.component';
import { Tile } from '@app/interfaces/tile';
import { GameService } from '@app/services/game.service';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [TileComponent, CommonModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit {
    @Input() rows: number;
    @Input() cols: number;
    grid: Tile[][] | undefined = [];

    constructor(private gameService: GameService) {}

    ngOnInit() {
        this.grid = this.gameService.getCurrentGame()?.grid;
    }
}
