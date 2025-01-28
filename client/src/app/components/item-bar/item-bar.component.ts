import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Item } from '@app/interfaces/item';
import { ItemDragService } from '@app/services/ItemDrag.service';

@Component({
    selector: 'app-item-bar',
    templateUrl: './item-bar.component.html',
    styleUrls: ['./item-bar.component.scss'],
    standalone: true,
    imports: [CommonModule, DragDropModule],
})
export class ItemBarComponent {
    @Input() itemCount: number = 4;
    activeItem: Item | undefined = undefined;
    items: Item[] = [];

    constructor(private itemDragService: ItemDragService) {}

    ngOnInit() {
        this.items = [
            { id: '0', name: 'lightning', imageSrc: 'assets/images/Lightning.png', imageSrcGrey: 'assets/images/lightning-grey.png', itemCounter: 1 },
            { id: '1', name: 'potion', imageSrc: 'assets/images/potion.png', imageSrcGrey: 'assets/images/spikes.png', itemCounter: 1 },
            { id: '2', name: 'spikes', imageSrc: 'assets/images/spikes.png', imageSrcGrey: 'assets/images/spikes-grey.png', itemCounter: 1 },
            { id: '3', name: 'stop', imageSrc: 'assets/images/stop.png', imageSrcGrey: 'assets/images/stop-grey.png', itemCounter: 1 },
            { id: '4', name: 'home', imageSrc: 'assets/images/home.png', imageSrcGrey: 'assets/images/home-grey.png', itemCounter: 1 },
            { id: '5', name: 'question', imageSrc: 'assets/images/question.png', imageSrcGrey: 'assets/images/question-grey.png', itemCounter: 1 },
        ].map((data) => Object.assign(new Item(), data));

        const flag = false;

        if (flag) {
            this.items.push(
                Object.assign(new Item(), {
                    id: '6',
                    name: 'flag',
                    imageSrc: 'assets/images/flag.png',
                    imageSrcGrey: 'assets/images/flag-grey.png',
                    itemCounter: 1,
                }),
            );
        }
    }

    selectObject(item: Item): void {
        this.itemDragService.setSelectedItem(item);
        this.activeItem = this.itemDragService.getSelectedItem();
    }

    removeObject(): void {
        this.itemDragService.setSelectedItem(undefined);
    }

    isDragDisabled(item: Item): boolean {
        return item.itemCounter <= 0;
    }
}
