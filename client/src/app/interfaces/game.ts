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

export interface Game {
    id: string;
    name: string;
    size: string;
    mode: string;
    lastModified: Date;
    isVisible: boolean;
    previewImage: string; 
    description: string;
    grid: Tile[][] | undefined;
}
