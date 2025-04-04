import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/statistics';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';

@Component({
    selector: 'app-game-end',
    templateUrl: './game-end.component.html',
    styleUrls: ['./game.end.component.scss'],
    imports: [CommonModule],
})
export class GameEndComponent implements OnInit {
    gameStats!: GameStatistics;
    sortedStats: PlayerStatistics[] = [];
    sortKey: keyof PlayerStatistics | '' = '';
    sortAsc = true;

    constructor(
        private router: Router,
        private gameStateSocketService: GameStateSocketService,
    ) {}

    ngOnInit(): void {
        this.gameStats = this.gameStateSocketService.gameDataSubjectValue.gameStats;
        this.sortedStats = Object.values(this.gameStats.playerStats);
        this.sortedStats.sort((a, b) => a.playerName.localeCompare(b.playerName));
    }

    sortBy(column: keyof PlayerStatistics): void {
        if (this.sortKey === column) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortKey = column;
            this.sortAsc = true;
        }

        this.sortedStats.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            if (valA instanceof Set) valA = valA.size;
            if (valB instanceof Set) valB = valB.size;

            if (valA === valB) return 0;
            return this.sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
        });
    }

    goHome(): void {
        this.router.navigate(['/home']);
    }
}
