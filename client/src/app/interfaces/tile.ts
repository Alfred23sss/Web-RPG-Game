import { Item } from '@app/classes/item';
import { TileType} from '@app/enums/global.enums';

export interface Tile {
    id: string;
    imageSrc: string;
    isOccupied: boolean;
    type: TileType;
    isOpen: boolean;
    item?: Item;
}
