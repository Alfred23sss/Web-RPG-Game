import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Item } from '@app/classes/item';

@Component({
    selector: 'app-item-pop-up',
    templateUrl: './item-pop-up.component.html',
    styleUrls: ['./item-pop-up.component.scss'],
})
export class ItemPopUpComponent {
    private isClosing = false;

    constructor(
        public dialogRef: MatDialogRef<ItemPopUpComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { items: [Item, Item, Item] },
    ) {}

    selectItem(item: Item): void {
        if (!this.isClosing) {
            this.isClosing = true;
            this.dialogRef.close(item);
        }
    }
}
