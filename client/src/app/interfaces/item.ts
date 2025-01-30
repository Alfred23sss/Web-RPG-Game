export class Item {
    id: string = '';
    imageSrc: string = '';
    imageSrcGrey: string = '';
    name: string = '';
    itemCounter: number = 0;
    originalReference?: Item;

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
        return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }
}
