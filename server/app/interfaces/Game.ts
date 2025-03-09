import { Tile } from '@app/model/database/tile';
import { Turn } from './Turn';

export enum GameMode {
    Classic = 'Classique',
    CTF = 'CTF',
    None = '',
}
export enum GameSize {
    Small = 'petit',
    Medium = 'moyen',
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
    turn: Turn | undefined;
}
