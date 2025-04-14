import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/gameData';
import { ChatComponent } from '@app/components/chat/chat.component';
import { Routes } from '@app/enums/global.enums';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/statistics';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

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
        private readonly gameStateSocketService: GameStateSocketService,
        // private readonly gameplayService: GameplayService,
        private readonly socketClientService: SocketClientService,
        private readonly router: Router,
    ) {}

    ngOnInit(): void {
        const wasRefreshed = sessionStorage.getItem('refreshed') === 'true';
        if (wasRefreshed || !this.gameStateSocketService.gameDataSubjectValue?.gameStats) {
            this.router.navigate(['/home']);
        }
        sessionStorage.setItem('refreshed', 'true');
        this.gameData = this.gameStateSocketService.gameDataSubjectValue;
        if (this.gameStateSocketService.gameDataSubjectValue?.gameStats) {
            this.gameStats = this.gameStateSocketService.gameDataSubjectValue.gameStats;
            this.sortedStats = Object.values(this.gameStats.playerStats);
            this.sortedStats.sort((a, b) => a.playerName.localeCompare(b.playerName));
        }
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
        this.abandonGame(this.gameData);
        this.router.navigate([Routes.HomePage]);
    }

    private abandonGame(gameData: GameData): void {
        gameData.clientPlayer.hasAbandoned = true;
        gameData.turnTimer = 0;
        this.socketClientService.emit('manualDisconnect', { isInGame: false });
    }
}
