import { Injectable } from '@angular/core';
import { Tile } from '@app/interfaces/tile';

@Injectable({
    providedIn: 'root',
})
export class GridService {
    private grid: Tile[][];
    constructor() {}
}
