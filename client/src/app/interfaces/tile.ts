import { Item } from '@app/interfaces/item';

export enum TileType {
    Water = 'water',
    Ice = 'ice',
    Wall = 'wall',
    Door = 'door',
    Default = 'default',
}

export enum ImageType {
    Water = 'assets/images/water.png',
    Wall = 'assets/images/wall.png',
    OpenDoor = 'assets/images/porte-ouverte.png',
    ClosedDoor = 'assets/images/porte-ferme.png',
    Ice = 'assets/images/ice.png',
    Default = 'assets/images/clay.png',
}

export interface Tile {
    id: string;
    imageSrc: string;
    isOccupied: boolean;
    type: TileType;
    isOpen: boolean;
    item?: Item;
}
