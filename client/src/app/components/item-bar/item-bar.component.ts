import { CdkDrag } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ItemComponent } from '@app/components/item/item.component';
import { ItemType } from '@app/interfaces/tile';
@Component({
    selector: 'app-item-bar',
    templateUrl: './item-bar.component.html',
    styleUrls: ['./item-bar.component.scss'],
    imports: [CommonModule, CdkDrag],
})
export class ItemBarComponent implements OnInit {
    @Input() itemCount: number = 4;
    activeItem: ItemComponent | null = null;
    items: ItemComponent[] = [];
    itemType = ItemType;

    ngOnInit() {
        this.items = [
            { id: '0', name: 'lightning', imageSrc: ItemType.Lightning, imageSrcGrey: '', itemCounter: 1 },
            { id: '1', name: 'potion', imageSrc: ItemType.Potion, imageSrcGrey: '', itemCounter: 1 },
            { id: '2', name: 'spikes', imageSrc: ItemType.Spikes, imageSrcGrey: '', itemCounter: 1 },
            { id: '3', name: 'stop', imageSrc: ItemType.Stop, imageSrcGrey: '', itemCounter: 1 },
            { id: '4', name: 'home', imageSrc: ItemType.Home, imageSrcGrey: '', itemCounter: 1 },
            { id: '5', name: 'question', imageSrc: ItemType.Question, imageSrcGrey: '', itemCounter: 1 },
        ].map((data) => Object.assign(new ItemComponent(), data));

        const flag = false;

        if (flag) {
            this.items.push(
                Object.assign(new ItemComponent(), {
                    id: '6',
                    name: 'flag',
                    imageSrc: '',
                    imageSrcGrey: '',
                    itemCounter: 1,
                }),
            );
        }
    }

    selectObject(item: ItemComponent): void {
        this.activeItem = item;
    }
}
