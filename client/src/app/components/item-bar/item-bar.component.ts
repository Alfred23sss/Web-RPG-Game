import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Item } from '@app/classes/item';
import { ItemDescription, ItemName, ItemType } from '@app/enums/global.enums';
import { ItemService } from '@app/services/item/item.service';
import { ItemDragService } from '@app/services/itemDrag/ItemDrag.service';

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
    ) {}

    ngOnInit(): void {
        this.items = [
            {
                id: '0',
                name: ItemName.Lightning,
                imageSrc: ItemType.Lightning,
                imageSrcGrey: ItemType.LightningGray,
                itemCounter: 1,
                description: ItemDescription.Lightning,
            },
            {
                id: '1',
                name: ItemName.Potion,
                imageSrc: ItemType.Potion,
                imageSrcGrey: ItemType.PotionGray,
                itemCounter: 1,
                description: ItemDescription.Potion,
            },
            {
                id: '2',
                name: ItemName.Rubik,
                imageSrc: ItemType.Rubik,
                imageSrcGrey: ItemType.RubikGray,
                itemCounter: 1,
                description: ItemDescription.Rubik,
            },
            {
                id: '3',
                name: ItemName.Stop,
                imageSrc: ItemType.Stop,
                imageSrcGrey: ItemType.StopGray,
                itemCounter: 1,
                description: ItemDescription.Stop,
            },
            {
                id: '4',
                name: ItemName.Fire,
                imageSrc: ItemType.Fire,
                imageSrcGrey: ItemType.FireGray,
                itemCounter: 1,
                description: ItemDescription.Fire,
            },
            {
                id: '5',
                name: ItemName.Swap,
                imageSrc: ItemType.Swap,
                imageSrcGrey: ItemType.SwapGray,
                itemCounter: 1,
                description: ItemDescription.Swap,
            },
            {
                id: '6',
                name: ItemName.Home,
                imageSrc: ItemType.Home,
                imageSrcGrey: ItemType.HomeGray,
                itemCounter: 2,
                description: ItemDescription.Home,
            },
            {
                id: '7',
                name: ItemName.QuestionMark,
                imageSrc: ItemType.QuestionMark,
                imageSrcGrey: ItemType.QuestionMarkGray,
                itemCounter: 2,
                description: ItemDescription.QuestionMark,
            },
        ].map((data) => Object.assign(new Item(), data));

        this.itemService.setItems(this.items);
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
