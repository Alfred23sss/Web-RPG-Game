export enum TileType {
    Water = 'water',
    Ice = 'ice',
    Wall = 'wall',
    Door = 'door',
    Default = 'default',
}

export interface Tile {
    id: string;
    imageSrc: string;
    isOccupied: boolean;
    type: TileType;
    isOpen: boolean;
}
