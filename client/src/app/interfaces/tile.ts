export enum TileType {
    Water = 'water',
    Ice = 'ice',
    Wall = 'wall',
    Door = 'door',
    Default = 'default',
}

export enum ImageType {
    Water = 'assets/tile-items/water.png',
    Wall = 'assets/tile-items/wall.png',
    OpenDoor = 'assets/tile-items/closed-door.png',
    ClosedDoor = 'assets/tile-items/opened-door.png',
    Ice = 'assets/tile-items/ice.png',
    Default = 'assets/tile-items/clay.png',
}

export interface Tile {
    id: string;
    imageSrc: string;
    isOccupied: boolean;
    type: TileType;
    isOpen: boolean;
}
