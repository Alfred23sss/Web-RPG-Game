import { Tile } from './tile';

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
