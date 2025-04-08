import { AttributeType } from '@app/enums/enums';

export interface Item {
    id: string;
    imageSrc: string;
    imageSrcGrey: string;
    name: string;
    itemCounter: number;
    description: string;
    originalReference?: Item;
    modifiers?: ItemModifier[];
    isActive?: boolean;
}

export interface ItemModifier {
    attribute: AttributeType;
    value: number;
}
