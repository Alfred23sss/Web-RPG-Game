import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Item } from '@app/classes/item';
import { GameplayService } from '@app/services/gameplay/gameplay.service';

@Component({
    selector: 'app-item-pop-up',
    templateUrl: './item-pop-up.component.html',
    styleUrls: ['./item-pop-up.component.scss'],
})
export class ItemPopUpComponent {
    constructor(
        public dialogRef: MatDialogRef<ItemPopUpComponent>,
        private gamePlayService: GameplayService,
        @Inject(MAT_DIALOG_DATA) public data: { items: [Item, Item, Item] },
    ) {}

    selectItem(item: Item): void {
        console.log('on close le popup');
        this.gamePlayService.handleItemDropped(this.gameData, item);
        this.dialogRef.close();
    }
}
