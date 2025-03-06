export interface Item {
    id: string;
    imageSrc: string;
    imageSrcGrey: string;
    name: string;
    itemCounter: number;
    description: string;
    originalReference?: Item;
}
