import { Item } from '@app/interfaces/item';

export enum TileType {
    Water = 'Water',
    Ice = 'Ice',
    Wall = 'Wall',
    Door = 'Door',
    Default = 'Default',
}

export enum ImageType {
    Water = 'assets/tile-items/water.png',
    Wall = 'assets/tile-items/wall.png',
    OpenDoor = 'assets/tile-items/opened-door.png',
    ClosedDoor = 'assets/tile-items/closed-door.png',
    Ice = 'assets/tile-items/ice.png',
    Default = 'assets/tile-items/clay.png',
}

export enum ItemType {
    Home = 'assets/items/home.png',
    HomeGray = 'assets/items/home-gray.png',
    Lightning = 'assets/items/lightning.png',
    LightningGray = 'assets/items/lightning-gray.png',
    Potion = 'assets/items/potion.png',
    PotionGray = 'assets/items/potion-gray.png',
    Stop = 'assets/items/stop.png',
    StopGray = 'assets/items/stop-gray.png',
    QuestionMark = 'assets/items/question-mark.png',
    QuestionMarkGray = 'assets/items/question-mark-gray.png',
    Fire = 'assets/items/fire.png',
    FireGray = 'assets/items/fire-gray.png',
    Rubik = 'assets/items/rubik.png',
    RubikGray = 'assets/items/rubik-gray.png',
    Swap = 'assets/items/swap.png',
    SwapGray = 'assets/items/swap-gray.png',
    Default = 'assets/items/question-mark.png',
}

export interface Tile {
    id: string;
    imageSrc: string;
    isOccupied: boolean;
    type: TileType;
    isOpen: boolean;
    item?: Item;
}
