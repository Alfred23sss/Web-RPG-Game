import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Game } from '@app/interfaces/game';

@Component({
    selector: 'app-game-info',
    standalone: true,
    imports: [DatePipe],
    template: `
        <div class="game-info">
            <h3>{{ game.name }}</h3>
            <p>Taille: {{ game.size }}x{{ game.size }}</p>
            <p>Mode de jeu: {{ game.mode }}</p>
            <p>Dernière modification: {{ game.lastModified | date: 'short' }}</p>
        </div>
    `,
    styleUrls: ['./game-info.component.scss'],
})
export class GameInfoComponent {
    @Input() game!: Game;
}
