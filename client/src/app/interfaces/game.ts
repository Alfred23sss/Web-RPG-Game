import { Tile } from './tile';

export enum GameMode {
    Classic = 'Classic',
    CTF = 'CTF',
    None = '',
}
export enum GameSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
    None = '',
}

// change size and mode for enums and change in the rest of the code

export interface Game {
    name: string;
    size: string;
    mode: string;
    lastModified: Date;
    isVisible: boolean;
    previewImage: string; // path to img
    description: string;
    grid: Tile[][] | undefined;
}
