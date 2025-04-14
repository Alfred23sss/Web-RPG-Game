import { MoveType } from '@app/enums/enums';
import { Tile } from './tile';

export interface Move {
    tile: Tile;
    inRange: boolean;
    type: MoveType;
    score?: number;
}
// add path and extra stuff so each moves hold all necessary attributes, no need to recalculate multiple times ...
