import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GridComponent } from '@app/components/grid/grid.component';
import { Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { LogBookService } from '@app/services/logbook/logbook.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Subscription } from 'rxjs';

const delayBeforeHome = 2000;

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

    constructor(
        private playerMovementService: PlayerMovementService,
        private router: Router,
        private socketClientService: SocketClientService,
        private logbookService: LogBookService,
        private snackbarService: SnackbarService,
    ) {
        this.logEntries = this.logbookService.logBook;
        this.logBookSubscription = this.logbookService.logBookUpdated.subscribe((logBook) => {
            this.logEntries = logBook;
        });
    }

    ngOnInit(): void {
        const lobby = sessionStorage.getItem('lobby');
        this.lobby = lobby ? (JSON.parse(lobby) as Lobby) : this.lobby; // lobby peut etre inutile, car on a accesscode
        const clientPlayer = sessionStorage.getItem('player');
        this.clientPlayer = clientPlayer ? (JSON.parse(clientPlayer) as Player) : this.clientPlayer;
        this.playerList = JSON.parse(sessionStorage.getItem('orderedPlayers') || '[]');
        const game = sessionStorage.getItem('game');
        this.game = game ? (JSON.parse(game) as Game) : this.game;

        this.handlePageRefresh();

        this.socketClientService.onAbandonGame((data) => {
            const abandonedPlayer = this.playerList.find((p) => p.name === data.player.name);
            if (!abandonedPlayer) return;
            abandonedPlayer.hasAbandoned = true;
            this.logbookService.addEntry(`${data.player.name} a abandonné la partie`, [abandonedPlayer]);
        });

        this.socketClientService.onGameDeleted(() => {
            this.snackbarService.showMessage("Trop de joueurs ont abandonnés la partie, vous allez être redirigé vers la page d'accueil");
            setTimeout(() => {
                this.backToHome();
            }, delayBeforeHome);
        });

        this.socketClientService.onTransitionStarted((data) => {
            this.snackbarService.showMessage(`Le tour à ${data.nextPlayer.name} commence dans ${data.transitionDuration} secondes`);
        });

        this.socketClientService.onTurnStarted((data) => {
            this.snackbarService.showMessage(`C'est à ${data.player.name} de jouer`);
            this.currentPlayer = data.player;
            this.turnTimer = data.turnDuration;
            if (this.currentPlayer.name === this.clientPlayer.name && this.game && this.game.grid) {
                this.availablePath = this.playerMovementService.availablePath(
                    this.getClientPlayerPosition(),
                    this.clientPlayer.movementPoints,
                    this.game.grid,
                );
            } else {
                this.availablePath = [];
            }
        });

        this.socketClientService.onTimerUpdate((data) => {
            this.turnTimer = data.timeLeft;
        });

        this.socketClientService.onAlertGameStarted((data) => {
            this.playerList = data.orderedPlayers;
            this.game = data.updatedGame;
        });
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
        this.isInCombatMode = true;
        this.snackbarService.showMessage('Mode combat activé');
    }
    abandonGame(): void {
        // for some reason marche pas quand on cliques sur boutton mais marche quand on refresh?
        this.clientPlayer.hasAbandoned = true;
        this.socketClientService.abandonGame(this.clientPlayer, this.lobby.accessCode);
        this.backToHome();
    }

    ngOnDestroy(): void {
        this.logBookSubscription.unsubscribe();
        sessionStorage.setItem('refreshed', 'false');
    }

    private isAvailablePath(tile: Tile): boolean {
        return this.availablePath ? this.availablePath.some((t) => t.id === tile.id) : false;
    }

    private handlePageRefresh(): void {
        if (sessionStorage.getItem('refreshed') === 'true') {
            this.abandonGame();
        } else {
            sessionStorage.setItem('refreshed', 'true');
        }
    }

    private getClientPlayerPosition(): Tile | undefined {
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
}
