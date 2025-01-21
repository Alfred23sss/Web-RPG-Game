import { Component } from '@angular/core';

@Component({
    selector: 'app-item',
    standalone: true,
    templateUrl: './item.component.html',
    styleUrls: ['./item.component.scss'],
})
export class ItemComponent {
    imageSrc: string = '';
    name: string = '';
}
