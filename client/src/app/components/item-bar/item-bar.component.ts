import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { GameSize } from '@app/interfaces/game';
import { Item } from '@app/interfaces/item';
import { ItemDescription, ItemType, Tile } from '@app/interfaces/tile';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { GameService } from '@app/services/game/game.service';
import { ItemService } from '@app/services/item/item.service';

const ITEM_COUNTS: Record<GameSize, number> = {
    [GameSize.Small]: 2,
    [GameSize.Medium]: 4,
    [GameSize.Large]: 6,
    [GameSize.None]: 0,
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
        private itemService: ItemService,
        private itemDragService: ItemDragService,
        private gameService: GameService,
    ) {}

    ngOnInit() {
        this.items = [
            {
                id: '0',
                name: 'lightning',
                imageSrc: ItemType.Lightning,
                imageSrcGrey: ItemType.LightningGray,
                itemCounter: 1,
                description: ItemDescription.Lightning,
            },
            {
                id: '1',
                name: 'potion',
                imageSrc: ItemType.Potion,
                imageSrcGrey: ItemType.PotionGray,
                itemCounter: 1,
                description: ItemDescription.Potion,
            },
            {
                id: '2',
                name: 'rubik',
                imageSrc: ItemType.Rubik,
                imageSrcGrey: ItemType.RubikGray,
                itemCounter: 1,
                description: ItemDescription.Rubik,
            },
            { 
                id: '3',
                name: 'stop',
                imageSrc: ItemType.Stop,
                imageSrcGrey: ItemType.StopGray,
                itemCounter: 1,
                description: ItemDescription.Stop,
            },
            { 
                id: '4',
                name: 'fire',
                imageSrc: ItemType.Fire,
                imageSrcGrey: ItemType.FireGray,
                itemCounter: 1,
                description: ItemDescription.Fire ,
            },
            { 
                id: '5',
                name: 'swap',
                imageSrc: ItemType.Swap,
                imageSrcGrey: ItemType.SwapGray,
                itemCounter: 1,
                description: ItemDescription.Swap,
            },
            {
                id: '6',
                name: 'home',
                imageSrc: ItemType.Home,
                imageSrcGrey: ItemType.HomeGray, 
                itemCounter: 2, 
                description: ItemDescription.Home ,
            },
            {
                id: '7',
                name: 'question',
                imageSrc: ItemType.QuestionMark,
                imageSrcGrey: ItemType.QuestionMarkGray,
                itemCounter: 2,
                description: ItemDescription.QuestionMark,
            },
        ].map((data) => Object.assign(new Item(), data));

        this.setItemCount();
        this.itemService.setItems(this.items);
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
        const currentGame = this.gameService.getCurrentGame();
        if (!currentGame) {
            console.warn('No game found.');
            return;
        }

        const rawSize = currentGame.size as unknown as number;
        const sizeMapping: Record<number, GameSize> = {
            10: GameSize.Small,
            15: GameSize.Medium,
            20: GameSize.Large,
        };
        const mappedSize = sizeMapping[rawSize] ?? GameSize.Small;
        const count = ITEM_COUNTS[mappedSize];

        this.items.forEach((item) => {
            if (ITEMS_TO_UPDATE.has(item.name)) {
                item.itemCounter = count;
            }
        });

        const grid = currentGame.grid as Tile[][] | undefined;
        if (!grid) return;

        grid.forEach((row) => {
            row.forEach((tile) => {
                if (tile.item) {
                    const item = this.items.find((i) => i.name === tile.item!.name);
                    if (item) {
                        item.itemCounter = Math.max(0, item.itemCounter - 1);
                    }
                }
            });
        });
    }

    onContainerDrop(event: DragEvent, item: Item): void {
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
