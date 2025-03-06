import { Item } from '@app/model/database/item';
import { TileType } from '@app/model/database/tile';

export interface Tile {
    id: string;
    imageSrc: string;
    isOccupied: boolean;
    type: TileType;
    isOpen: boolean;
    item?: Item;
}
