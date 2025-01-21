import { Injectable } from '@angular/core';
import { Tile } from '@app/interfaces/tile';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root',
})
export class TileService {
    private tile: Tile;
    constructor() {
        this.tile.id = uuidv4();
        this.tile.isOccupied = false;
        this.tile.isOpen = false;
        this.tile.type = 'clay';
    }

    public getTile() {
        return this.tile;
    }

    public setTile(tile: Tile) {
        this.tile = tile;
    }
}
