import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Game } from '@app/interfaces/game';

@Component({
    selector: 'app-game-info',
    standalone: true,
    imports: [DatePipe, MatTooltipModule],
    templateUrl: './game-info.component.html',
    styleUrls: ['./game-info.component.scss'],
})
export class GameInfoComponent {
    @Input() game!: Game;
}
