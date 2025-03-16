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

const noActionPoints = 0;
const defaultActionPoint = 1;
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
    isActionMode: boolean = false;
    isCurrentlyMoving: boolean = false;

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
        // enlever session storage simplement recevoir accessCode de waiting-view et get du serveur les infos necessaire
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
            this.isCurrentlyMoving = false;
            this.isActionMode = false;
            this.isInCombatMode = false;
            this.clientPlayer.actionPoints = defaultActionPoint;
            this.clientPlayer.movementPoints = this.clientPlayer.speed;
            this.turnTimer = data.turnDuration;
            this.updateAvailablePath();
        });

        this.socketClientService.onTimerUpdate((data) => {
            this.turnTimer = data.timeLeft;
        });

        this.socketClientService.onAlertGameStarted((data) => {
            this.playerList = data.orderedPlayers;
            this.game = data.updatedGame;
        });

        this.socketClientService.onPlayerMovement((data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => {
            if (this.game && this.game.grid) {
                this.game.grid = data.grid;
            }
            if (this.clientPlayer.name === data.player.name) {
                this.clientPlayer.movementPoints =
                    this.clientPlayer.movementPoints -
                    this.playerMovementService.calculateRemainingMovementPoints(this.getClientPlayerPosition(), data.player);
                this.isCurrentlyMoving = data.isCurrentlyMoving;
                this.updateAvailablePath();
            }
        });

        this.socketClientService.onGameCombatStarted(() => {
            this.isInCombatMode = true;
        });

        this.socketClientService.onAttackResult((data) => {
            if (data.success) {
                console.log(`Combat reussi score attaque: ${data.attackScore}, score defense: ${data.defenseScore}`);
            } else {
                console.log(`Combat perdu score attaque: ${data.attackScore}, score defense: ${data.defenseScore}`);
            }
        });

        this.socketClientService.onPlayerUpdate((data) => {
            if (this.clientPlayer.name === data.player.name) {
                this.clientPlayer = data.player;
            }
        });

        this.socketClientService.onPlayerListUpdate((data) => {
            console.log(data.players);
            this.playerList = data.players;
        });

        this.socketClientService.onDoorClickedUpdate((data) => {
            if (!this.game || !this.game.grid) {
                return;
            }
            this.game.grid = data.grid;
            this.clientPlayer.actionPoints = noActionPoints;
            this.isActionMode = false;
            this.updateAvailablePath();
        });

        this.socketClientService.onGameCombatTurnStarted((data) => {
            this.currentPlayer = data.fighter;
        });

        this.socketClientService.onGameCombatTimerUpdate((data) => {
            this.turnTimer = data.timeLeft;
        });

        this.socketClientService.onGridUpdate((data) => {
            if (!this.game || !this.game.grid) {
                return;
            }
            this.game.grid = data.grid;
        });
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
        if (this.isActionMode && currentTile && currentTile.player && this.game && this.game.grid) {
            if (this.findAndCheckAdjacentTiles(targetTile.id, currentTile.id, this.game.grid)) {
                this.socketClientService.startCombat(currentTile.player.name, targetTile.player.name, this.lobby.accessCode);
                return;
            }
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
        if (data.tile.player) {
            console.log(data.tile.player.name);
        } else {
            console.log(this.playerMovementService.getMoveCost(data.tile));
        }
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
        this.snackbarService.showMessage('Mode action activé');
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

    rollAttackDice(): void {
        // this.emit(this.clientPlayer.attackDice)
        return;
    }

    rollDefenseDice(): void {
        // this.emit(this.clientPlayer.attackDice)
        return;
    }

    private findAndCheckAdjacentTiles(tileId1: string, tileId2: string, grid: Tile[][]): boolean {
        let tile1Pos: { row: number; col: number } | null = null;
        let tile2Pos: { row: number; col: number } | null = null;
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                if (grid[row][col].id === tileId1) {
                    tile1Pos = { row, col };
                }
                if (grid[row][col].id === tileId2) {
                    tile2Pos = { row, col };
                }
                if (tile1Pos && tile2Pos) break;
            }
            if (tile1Pos && tile2Pos) break;
        }
        if (!tile1Pos || !tile2Pos) return false;
        return Math.abs(tile1Pos.row - tile2Pos.row) + Math.abs(tile1Pos.col - tile2Pos.col) === 1;
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

    private updateAvailablePath(): void {
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
}
