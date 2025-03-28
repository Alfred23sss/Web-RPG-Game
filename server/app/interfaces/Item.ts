import { AttributeType } from '@app/enums/enums';

export interface Item {
    itemName: import('c:/Users/louis/OneDrive - polymtl.ca/Session 4/LOG2990/LOG2990-309/server/app/enums/enums').ItemName;
    id: string;
    imageSrc: string;
    imageSrcGrey: string;
    name: string;
    itemCounter: number;
    description: string;
    originalReference?: Item;
    modifiers: ItemModifier[];
    isActive: boolean;
}

export interface ItemModifier {
    attribute: AttributeType;
    value: number;
}
