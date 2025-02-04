import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Item } from '@app/interfaces/item';
import { ItemType } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { GameService } from '@app/services/game/game.service';

enum GameSize {
    Small = '10',
    Medium = '15',
    Large = '20',
}

const ITEM_COUNTS: Record<GameSize, number> = {
    [GameSize.Small]: 2,
    [GameSize.Medium]: 4,
    [GameSize.Large]: 6,
};

const ITEMS_TO_UPDATE = new Set(['home', 'question']);

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
        private itemDragService: ItemDragService,
        private gameService: GameService,
    ) {}

    ngOnInit() {
        this.items = [
            { id: '0', name: 'lightning', imageSrc: ItemType.Lightning, imageSrcGrey: 'assets/images/lightning-grey.png', itemCounter: 1 },
            { id: '1', name: 'potion', imageSrc: ItemType.Potion, imageSrcGrey: 'assets/images/potion-grey.png', itemCounter: 1 },
            { id: '2', name: 'rubik', imageSrc: 'assets/images/rubik.png', imageSrcGrey: 'assets/images/rubik-grey.png', itemCounter: 1 },
            { id: '3', name: 'stop', imageSrc: ItemType.Stop, imageSrcGrey: 'assets/images/stop-grey.png', itemCounter: 1 },
            { id: '4', name: 'fire', imageSrc: 'assets/images/fire.png', imageSrcGrey: 'assets/images/fire-grey.png', itemCounter: 1 },
            { id: '5', name: 'swap', imageSrc: 'assets/images/swap.png', imageSrcGrey: 'assets/images/swap-grey.png', itemCounter: 1 },
            { id: '6', name: 'home', imageSrc: ItemType.Home, imageSrcGrey: 'assets/images/home-grey.png', itemCounter: 2 },
            { id: '7', name: 'question', imageSrc: ItemType.Question, imageSrcGrey: 'assets/images/question-mark-grey.png', itemCounter: 2, },
        ].map((data) => Object.assign(new Item(), data));
        this.setItemCount();
    }

    selectObject(item: Item): void {
        this.itemDragService.setSelectedItem(item, undefined);
        this.activeItem = this.itemDragService.getSelectedItem();
    }

    removeObject(): void {
        this.itemDragService.setSelectedItem(undefined, undefined);
    }

    isDragDisabled(item: Item): boolean {
        return item.itemCounter <= 0;
    }

    setItemCount() {
        const size = this.gameService.getCurrentGame()?.size as GameSize;
        const count = ITEM_COUNTS[size] ?? ITEM_COUNTS[GameSize.Small];

        this.items.forEach((item) => {
            if (ITEMS_TO_UPDATE.has(item.name)) {
                item.itemCounter = count;
            }
        });
    }

    onDrop(event: DragEvent, item: Item): void {
        event.preventDefault();

        const draggedItem = this.itemDragService.getSelectedItem();
        const previousTile = this.itemDragService.getPreviousTile();

        if (!draggedItem) {
            return;
        }
        if (draggedItem.name !== item.name) {
            return;
        }
        if (draggedItem.id === item.id) {
            return;
        }

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
