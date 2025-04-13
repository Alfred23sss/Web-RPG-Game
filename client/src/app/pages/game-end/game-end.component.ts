import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameData } from '@app/classes/gameData';
import { ChatComponent } from '@app/components/chat/chat.component';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/statistics';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';

@Component({
    selector: 'app-game-end',
    templateUrl: './game-end.component.html',
    styleUrls: ['./game-end.component.scss'],
    standalone: true,
    imports: [CommonModule, ChatComponent],
})
export class GameEndComponent implements OnInit, OnDestroy {
    gameStats!: GameStatistics;
    sortedStats: PlayerStatistics[] = [];
    gameData: GameData = new GameData();
    sortKey: keyof PlayerStatistics | '' = '';
    sortAsc = true;
    objectKeys = Object.keys;

    constructor(
        private gameStateSocketService: GameStateSocketService,
        private gameplayService: GameplayService,
    ) {}

    ngOnInit(): void {
        this.gameStats = this.gameStateSocketService.gameDataSubjectValue.gameStats;
        this.sortedStats = Object.values(this.gameStats.playerStats);
        this.sortedStats.sort((a, b) => a.playerName.localeCompare(b.playerName));
    }

    ngOnDestroy(): void {
        sessionStorage.setItem('refreshed', 'false');
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
        this.gameplayService.abandonGame(this.gameStateSocketService.gameDataSubjectValue);
    }
}
