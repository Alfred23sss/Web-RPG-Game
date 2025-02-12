import { Item } from '@app/classes/item';

export enum TileType {
    Water = 'eau',
    Ice = 'glace',
    Wall = 'mur',
    Door = 'porte',
    Default = 'défaut',
}

export enum ItemDescription {
    Home = 'Point de départ',
    Lightning = 'paralyse',
    Potion = 'soigne',
    Stop = 'arrêt le jeu',
    QuestionMark = 'objet aléatoire',
    Fire = 'inflige des brûlure',
    Rubik = 'bouge les colonnes ou les rangés',
    Swap = 'échange les personnages',
    Default = 'rien',
}

export interface Tile {
    id: string;
    imageSrc: string;
    isOccupied: boolean;
    type: TileType;
    isOpen: boolean;
    item?: Item;
}
