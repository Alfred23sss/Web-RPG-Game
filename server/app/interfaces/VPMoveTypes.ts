import { Tile } from './Tile';

export interface VPMoveType {
    playerTiles: Tile[];
    itemTiles: Tile[];
    doors: Tile[];
}
