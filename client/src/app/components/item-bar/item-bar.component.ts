import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ItemComponent } from '../item/item.component';

@Component({
    selector: 'app-item-bar',
    templateUrl: './item-bar.component.html',
    styleUrls: ['./item-bar.component.scss'],
    imports: [CommonModule],
})
export class ItemBarComponent {
    @Input() itemCount: number = 4;
    activeItem: ItemComponent | null = null;

    selectObject(item: ItemComponent): void {
        this.activeItem = item;
    }
}
