import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/game-data/game-data';
import { ChatComponent } from '@app/components/chat/chat.component';
import { REFRESH_STORAGE } from '@app/constants/global.constants';
import { SocketEvent } from '@app/enums/global.enums';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/statistics';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Routes } from '@common/enums';

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
        private readonly socketClientService: SocketClientService,
        private readonly router: Router,
        private readonly characterService: CharacterService,
    ) {}

    ngOnInit(): void {
        const wasRefreshed = sessionStorage.getItem(REFRESH_STORAGE) === 'true';
        if (wasRefreshed || !this.gameStateSocketService.gameDataSubjectValue?.gameStats) {
            this.router.navigate([Routes.HomePage]);
            this.refreshAvatarChoice();
        }
        sessionStorage.setItem(REFRESH_STORAGE, 'true');
        this.gameData = this.gameStateSocketService.gameDataSubjectValue;
        if (this.gameStateSocketService.gameDataSubjectValue?.gameStats) {
            this.gameStats = this.gameStateSocketService.gameDataSubjectValue.gameStats;
            this.sortedStats = Object.values(this.gameStats.playerStats);
            this.sortedStats.sort((a, b) => a.playerName.localeCompare(b.playerName));
        }
    }

    ngOnDestroy(): void {
        sessionStorage.setItem(REFRESH_STORAGE, 'false');
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
        this.refreshAvatarChoice();
        this.abandonGame(this.gameData);
        this.router.navigate([Routes.HomePage]);
    }

    private abandonGame(gameData: GameData): void {
        gameData.clientPlayer.hasAbandoned = true;
        gameData.turnTimer = 0;
        this.socketClientService.emit(SocketEvent.ManualDisconnect, { isInGame: false });
    }

    private refreshAvatarChoice(): void {
        this.characterService.unavailableAvatarsSubject.next([]);
    }
}
