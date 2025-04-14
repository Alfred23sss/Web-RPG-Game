import { Item } from '@app/classes/item';
import { TileType } from '@common/enums';
import { Player } from './player';

export interface Tile {
    id: string;
    imageSrc: string;
    isOccupied: boolean;
    type: TileType;
    isOpen: boolean;
    item?: Item;
    player?: Player;
}

export interface GridPosition {
    row: number;
    col: number;
}
