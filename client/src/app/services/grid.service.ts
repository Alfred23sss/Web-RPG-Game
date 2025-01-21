import { Injectable } from '@angular/core';
import { TileService } from './tile.service';

@Injectable({
    providedIn: 'root',
})
export class GridService {
    constructor(private tileService: TileService) {}

    createGrid(size: number) {
        return Array.from({ length: size }, () => Array.from({ length: size }, () => this.tileService.createTile()));
    }
}
