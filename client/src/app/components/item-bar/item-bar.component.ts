import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ItemDragService } from '@app/services/ItemDrag.service';
import { ItemComponent } from '../item/item.component';

@Component({
    selector: 'app-item-bar',
    templateUrl: './item-bar.component.html',
    styleUrls: ['./item-bar.component.scss'],
    standalone: true,
    imports: [CommonModule, DragDropModule],
})
export class ItemBarComponent {
    @Input() itemCount: number = 4;
    activeItem: ItemComponent | undefined = undefined;
    items: ItemComponent[] = [];

    constructor(private itemDragService: ItemDragService) {}

    ngOnInit() {
        this.items = [
            { id: '0', name: 'lightning', imageSrc: 'assets/images/Lightning.png', imageSrcGrey: 'assets/images/lightning-grey.png', itemCounter: 1 },
            { id: '1', name: 'potion', imageSrc: 'assets/images/potion.png', imageSrcGrey: 'assets/images/spikes.png', itemCounter: 1 },
            { id: '2', name: 'spikes', imageSrc: 'assets/images/spikes.png', imageSrcGrey: 'assets/images/spikes-grey.png', itemCounter: 1 },
            { id: '3', name: 'stop', imageSrc: 'assets/images/stop.png', imageSrcGrey: 'assets/images/stop-grey.png', itemCounter: 1 },
            { id: '4', name: 'home', imageSrc: 'assets/images/home.png', imageSrcGrey: 'assets/images/home-grey.png', itemCounter: 1 },
            { id: '5', name: 'question', imageSrc: 'assets/images/question.png', imageSrcGrey: 'assets/images/question-grey.png', itemCounter: 1 },
        ].map((data) => Object.assign(new ItemComponent(), data));

        const flag = false;

        if (flag) {
            this.items.push(
                Object.assign(new ItemComponent(), {
                    id: '6',
                    name: 'flag',
                    imageSrc: 'assets/images/flag.png',
                    imageSrcGrey: 'assets/images/flag-grey.png',
                    itemCounter: 1,
                }),
            );
        }
    }

    selectObject(item: ItemComponent): void {
        this.itemDragService.setSelectedItem(item);
        this.activeItem = this.itemDragService.getSelectedItem();
    }

    removeObject(): void {
        this.itemDragService.setSelectedItem(undefined);
    }

    isDragDisabled(item: ItemComponent): boolean {
        return item.itemCounter <= 0;
    }
}
