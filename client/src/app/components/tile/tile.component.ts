import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-tile',
    standalone: true,
    templateUrl: './tile.component.html',
    styleUrls: ['./tile.component.scss'],
})
export class TileComponent {
    @Input() id: string = '';
    @Input() imageSrc: string = `assets/images/clay.png`;
    @Input() isOccupied: boolean = false;
    @Input() type: string = 'default';
    @Input() isOpen: boolean = true;
}
