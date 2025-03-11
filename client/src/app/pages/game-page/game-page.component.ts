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
    currentPlayer: Player;
    availablePath: Tile[] | undefined;
    quickestPath: Tile[] | undefined;
    playerTile: Tile | undefined;
    lobby: Lobby;
    playerList: Player[];
    logEntries: string[] = [];
    activeTab: 'chat' | 'log' = 'chat';
    logBookSubscription: Subscription;

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
        const currentPlayer = sessionStorage.getItem('player');
        this.currentPlayer = currentPlayer ? (JSON.parse(currentPlayer) as Player) : this.currentPlayer;
        this.playerList = JSON.parse(sessionStorage.getItem('orderedPlayers') || '[]');
        const game = sessionStorage.getItem('game');
        this.game = game ? (JSON.parse(game) as Game) : this.game;

        if (this.game && this.game.grid) {
            this.availablePath = this.playerMovementService.availablePath(
                this.getCurrentPlayerPosition(),
                this.currentPlayer.movementPoints,
                this.game.grid,
            );
        }

        // tres moche ^^^ si quelquun trouve meilleur syntaxe hesiter pas a changer ^^^
        // this.gridService.setGrid(this.game?.grid);
        // if (this.game && this.game.grid) {
        //     this.availablePath = this.playerMovementService.availablePath(this.game.grid[1][7], playerMovement, this.game.grid);
        // }

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

        this.socketClientService.onAlertGameStarted((data) => {
            this.playerList = data.orderedPlayers;
            this.game = data.updatedGame;
        });
    }

    updateQuickestPath(targetTile: Tile): void {
        if (!(this.game && this.game.grid) || !this.isAvailablePath(targetTile)) {
            this.quickestPath = undefined;
        } else {
            this.quickestPath = this.playerMovementService.quickestPath(this.getCurrentPlayerPosition(), targetTile, this.game.grid) || [];
        }
    }

    backToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    endTurn(): void {
        return;
    }

    executeNextAction(): void {
        return;
    }
    abandonGame(): void {
        this.currentPlayer.hasAbandoned = true;
        this.socketClientService.abandonGame(this.currentPlayer, this.lobby.accessCode);
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

    private getCurrentPlayerPosition(): Tile | undefined {
        if (!this.game || !this.game.grid || !this.currentPlayer) {
            return undefined;
        }
        for (const row of this.game.grid) {
            for (const tile of row) {
                if (tile.player && tile.player.name === this.currentPlayer.name) {
                    return tile;
                }
            }
        }
        return undefined;
    }
}
