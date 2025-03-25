import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Item } from '@app/classes/item';
import { ITEM_BAR_ITEMS } from '@app/constants/global.constants';
import { ItemDragService } from '@app/services/item-drag/Item-drag.service';
import { ItemService } from '@app/services/item/item.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';

@Component({
    selector: 'app-item-bar',
    templateUrl: './item-bar.component.html',
    styleUrls: ['./item-bar.component.scss'],
    standalone: true,
    imports: [CommonModule, DragDropModule],
})
export class ItemBarComponent implements OnInit {
    activeItem: Item | undefined = undefined;
    items: Item[] = [];

    constructor(
        private itemService: ItemService,
        private itemDragService: ItemDragService,
        private gameModeService: GameModeService,
    ) {}

    ngOnInit(): void {
        this.items = ITEM_BAR_ITEMS.map((data) => Object.assign(new Item(), data));
        if (this.gameModeService.getGameMode() === 'Classique') {
            this.items = this.items.filter((item) => item.name !== 'flag');
        }

        this.itemService.setItems(this.items, this.gameModeService.getGameMode());
        this.itemService.setItemCount();
    }

    selectObject(item: Item): void {
        this.itemDragService.setSelectedItem(item, undefined);
        this.activeItem = this.itemDragService.getSelectedItem();
    }

    removeObject(): void {
        this.itemDragService.setSelectedItem(undefined, undefined);
    }

    onContainerDrop(event: DragEvent, item: Item): void {
        event.preventDefault();

        const draggedItem = this.itemDragService.getSelectedItem();
        const previousTile = this.itemDragService.getPreviousTile();

        if (!draggedItem) return;

        if (draggedItem.name !== item.name) return;

        if (draggedItem.id === item.id) return;

        item.itemCounter++;

        if (previousTile && previousTile.item === draggedItem) {
            previousTile.item = undefined;
        }
        this.itemDragService.clearSelection();
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
    }
}
