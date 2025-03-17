import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GridComponent } from '@app/components/grid/grid.component';
import { Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
import { LogBookService } from '@app/services/logbook/logbook.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Subscription } from 'rxjs';

const noActionPoints = 0;

@Component({
    selector: 'app-game-page',
    standalone: true,
    templateUrl: './game-page.component.html',
    styleUrls: ['./game-page.component.scss'],
    imports: [CommonModule, GridComponent],
})
export class GamePageComponent implements OnInit, OnDestroy {
    game: Game | null;
    wasRefreshed: boolean = false;
    clientPlayer: Player;
    currentPlayer: Player;
    availablePath: Tile[] | undefined;
    quickestPath: Tile[] | undefined;
    playerTile: Tile | undefined;
    lobby: Lobby;
    playerList: Player[];
    logEntries: string[] = [];
    activeTab: 'chat' | 'log' = 'chat';
    logBookSubscription: Subscription;
    turnTimer: number;
    isInCombatMode: boolean = false;
    isActionMode: boolean = false;
    isCurrentlyMoving: boolean = false;

    constructor(
        private playerMovementService: PlayerMovementService,
        private router: Router,
        private socketClientService: SocketClientService,
        private logbookService: LogBookService,
        private gameSocketService: GameSocketService,
    ) {
        this.logEntries = this.logbookService.logBook;
        this.logBookSubscription = this.logbookService.logBookUpdated.subscribe((logBook) => {
            this.logEntries = logBook;
        });
    }

    ngOnInit(): void {
        this.gameSocketService.initializeSocketListeners(this);
    }

    handleDoorClick(targetTile: Tile): void {
        if (this.isInCombatMode || this.clientPlayer.actionPoints === noActionPoints || !this.isActionMode) return;
        const currentTile = this.getClientPlayerPosition();
        if (!currentTile || !this.game || !this.game.grid) {
            return;
        }
        this.socketClientService.sendDoorUpdate(currentTile, targetTile, this.lobby.accessCode);
    }

    handleAttackClick(targetTile: Tile): void {
        if (!targetTile.player || targetTile.player === this.clientPlayer || this.clientPlayer.actionPoints === noActionPoints) return;
        const currentTile = this.getClientPlayerPosition();
        if (this.isActionMode && currentTile && currentTile.player) {
            this.socketClientService.startCombat(currentTile.player.name, targetTile.player.name, this.lobby.accessCode);
            return;
        }
    }

    handleTileClick(targetTile: Tile): void {
        if (this.isActionMode || this.isCurrentlyMoving) return;
        const currentTile = this.getClientPlayerPosition();
        if (!currentTile || !this.game || !this.game.grid) {
            return;
        }
        this.socketClientService.sendPlayerMovementUpdate(currentTile, targetTile, this.lobby.accessCode, this.game.grid);
    }
    handleTileRightClick(data: { tile: Tile; event: MouseEvent }): void {
        const { tile, event } = data;
        console.log(tile, event);
        return;
    }
    updateQuickestPath(targetTile: Tile): void {
        if (!(this.game && this.game.grid) || !this.isAvailablePath(targetTile)) {
            this.quickestPath = undefined;
        } else {
            this.quickestPath = this.playerMovementService.quickestPath(this.getClientPlayerPosition(), targetTile, this.game.grid) || [];
        }
    }

    backToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    endTurn(): void {
        this.turnTimer = 0;
        this.socketClientService.endTurn(this.lobby.accessCode);
    }

    executeNextAction(): void {
        console.log(this.isActionMode);
        this.isActionMode = !this.isActionMode;
        this.gameSocketService.showMessage('Mode combat activé');
    }
    abandonGame(): void {
        this.clientPlayer.hasAbandoned = true;
        this.socketClientService.abandonGame(this.clientPlayer, this.lobby.accessCode);
        this.backToHome();
    }

    ngOnDestroy(): void {
        this.logBookSubscription.unsubscribe();
        sessionStorage.setItem('refreshed', 'false');
    }

    rollAttackDice(): void {
        return;
    }

    rollDefenseDice(): void {
        return;
    }

    updateAvailablePath(): void {
        if (this.currentPlayer.name === this.clientPlayer.name && this.game && this.game.grid) {
            this.availablePath = this.playerMovementService.availablePath(
                this.getClientPlayerPosition(),
                this.clientPlayer.movementPoints,
                this.game.grid,
            );
        } else {
            this.availablePath = [];
        }
    }

    getClientPlayerPosition(): Tile | undefined {
        if (!this.game || !this.game.grid || !this.clientPlayer) {
            return undefined;
        }
        for (const row of this.game.grid) {
            for (const tile of row) {
                if (tile.player && tile.player.name === this.clientPlayer.name) {
                    return tile;
                }
            }
        }
        return undefined;
    }

    handlePageRefresh(): void {
        if (sessionStorage.getItem('refreshed') === 'true') {
            this.abandonGame();
        } else {
            sessionStorage.setItem('refreshed', 'true');
        }
    }

    private isAvailablePath(tile: Tile): boolean {
        return this.availablePath ? this.availablePath.some((t) => t.id === tile.id) : false;
    }
}
