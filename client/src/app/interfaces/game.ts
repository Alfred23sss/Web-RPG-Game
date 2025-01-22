export interface Game {
    name: string;
    size: string;
    mode: string;
    lastModified: Date;
    isVisible: boolean;
    previewImage: string; // path to img
    description: string;
}
