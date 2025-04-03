import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Item } from '@app/classes/item';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';

@Component({
    selector: 'app-item-pop-up',
    templateUrl: './item-pop-up.component.html',
    styleUrls: ['./item-pop-up.component.scss'],
})
export class ItemPopUpComponent {
    constructor(
        public dialogRef: MatDialogRef<ItemPopUpComponent>,
        private gameStateSocketService: GameStateSocketService,
        private gameplayService: GameplayService,
        @Inject(MAT_DIALOG_DATA) public data: { items: [Item, Item, Item] },
    ) {}

    selectItem(item: Item): void {
        this.gameplayService.handleItemDropped(this.gameStateSocketService.gameDataSubjectValue, item);
        this.dialogRef.afterClosed().subscribe(() => {
            this.gameplayService.checkAvailableActions(this.gameStateSocketService.gameDataSubjectValue);
        });
        this.dialogRef.close();
    }
}
