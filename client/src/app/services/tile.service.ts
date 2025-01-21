import { Injectable } from '@angular/core';
import { Tile } from '@app/interfaces/tile';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root',
})
export class TileService {
    createTile(): Tile {
        return {
            id: uuidv4(),
            img: '/assets/images/clay.png',
            isOccupied: false,
            isOpen: false,
            type: 'clay',
        };
    }
}
