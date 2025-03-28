import { v4 as uuidv4 } from 'uuid';

export class Item {
    id: string = '';
    imageSrc: string = '';
    imageSrcGrey: string = '';
    name: string = '';
    itemCounter: number = 0;
    description: string = '';
    modifiers?: ItemModifier[];
    isActive?: boolean;

    constructor(init?: Partial<Item>) {
        if (init) {
            Object.assign(this, init);
        }
    }

    clone(): Item {
        return new Item({
            ...this,
            id: this.generateUniqueId(),
            originalReference: this,
        });
    }

    private generateUniqueId(): string {
        return uuidv4();
    }
}
