import { MoveType } from '@app/enums/enums';
import { Tile } from './tile';

export interface Move {
    tile: Tile;
    inRange: boolean;
    type: MoveType;
    score?: number;
}
