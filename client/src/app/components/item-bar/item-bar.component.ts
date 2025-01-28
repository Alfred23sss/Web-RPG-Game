import { CdkDrag } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ItemComponent } from '@app/components/item/item.component';

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

    ngOnInit() {
        this.items = [
            { id: '0', name: 'lightning', imageSrc: '', imageSrcGrey: '', itemCounter: 1 },
            { id: '1', name: 'potion', imageSrc: '', imageSrcGrey: '', itemCounter: 1 },
            { id: '2', name: 'spikes', imageSrc: '', imageSrcGrey: '', itemCounter: 1 },
            { id: '3', name: 'stop', imageSrc: '', imageSrcGrey: '', itemCounter: 1 },
            { id: '4', name: 'home', imageSrc: '', imageSrcGrey: '', itemCounter: 1 },
            { id: '5', name: 'question', imageSrc: '', imageSrcGrey: '', itemCounter: 1 },
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
