import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/statistics';

@Component({
    selector: 'app-game-end',
    templateUrl: './game-end.component.html',
    styleUrls: ['./game-end.component.css'],
    imports: [CommonModule],
})
export class GameEndComponent implements OnInit {
    gameStats!: GameStatistics;
    sortedStats: PlayerStatistics[] = [];
    sortKey: keyof PlayerStatistics | '' = '';
    sortAsc = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.route.queryParams.subscribe((params) => {
            const stats = JSON.parse(params['gameStats']);
            this.gameStats = stats;

            // Convert playerStats Map to an array for sorting and displaying
            this.sortedStats = Array.from(stats.playerStats.values());
        });
    }

    sortBy(column: keyof PlayerStatistics): void {
        if (this.sortKey === column) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortKey = column;
            this.sortAsc = true;
        }

        this.sortedStats.sort((a, b) => {
            const valA = a[column];
            const valB = b[column];
            return this.sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
        });
    }

    goHome(): void {
        this.router.navigate(['/home']);
    }
}
