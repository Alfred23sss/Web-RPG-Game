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
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
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
    escapeAttempts: number = 2;
    evadeResult: { attemptsLeft: number; isEscapeSuccessful: boolean } | null = null;
    attackResult: { success: boolean; attackScore: number; defenseScore: number } | null = null;
    movementPointsRemaining: number = 0;
    isDebugMode: boolean = false;
    private keyPressHandler: (event: KeyboardEvent) => void;

    constructor(
        private playerMovementService: PlayerMovementService,
        private router: Router,
        private socketClientService: SocketClientService,
        private snackbarService: SnackbarService,
        private gameSocketService: GameSocketService,
    ) {}

    ngOnInit(): void {
        this.gameSocketService.initializeSocketListeners(this);
        this.keyPressHandler = this.handleKeyPress.bind(this);
        document.addEventListener('keydown', this.keyPressHandler);
    }

    handleDoorClick(targetTile: Tile): void {
        if (this.isInCombatMode || this.clientPlayer.actionPoints === noActionPoints || !this.isActionMode) return;
        const currentTile = this.getClientPlayerPosition();
        if (!currentTile || !this.game || !this.game.grid) {
            return;
        }
        this.socketClientService.emit('doorUpdate', {
            currentTile,
            targetTile,
            accessCode: this.lobby.accessCode,
        });

        if (!this.clientPlayer.actionPoints || !this.movementPointsRemaining) {
            this.endTurn();
        }
    }

    handleAttackClick(targetTile: Tile): void {
        if (!targetTile.player || targetTile.player === this.clientPlayer || this.clientPlayer.actionPoints === noActionPoints) return;
        const currentTile = this.getClientPlayerPosition();

        if (this.isActionMode && currentTile && currentTile.player && this.game && this.game.grid) {
            if (this.findAndCheckAdjacentTiles(targetTile.id, currentTile.id, this.game.grid)) {
                this.socketClientService.emit('startCombat', {
                    attackerName: currentTile.player.name,
                    defenderName: targetTile.player.name,
                    accessCode: this.lobby.accessCode,
                    isDebugMode: this.isDebugMode,
                });
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

    handleTeleport(targetTile: Tile): void {
        if (this.isInCombatMode) return;
        if (this.clientPlayer.name === this.currentPlayer.name) {
            this.socketClientService.emit('teleportPlayer', {
                accessCode: this.lobby.accessCode,
                player: this.clientPlayer,
                targetTile,
            });
        }
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
        this.socketClientService.emit('endTurn', { accessCode: this.lobby.accessCode });
    }

    executeNextAction(): void {
        this.isActionMode = !this.isActionMode;
        const message = this.isActionMode ? 'Mode action activé' : 'Mode action désactivé';
        this.snackbarService.showMessage(message);
    }
    abandonGame(): void {
        this.clientPlayer.hasAbandoned = true;
        this.socketClientService.emit('abandonedGame', { player: this.clientPlayer, accessCode: this.lobby.accessCode });
        this.backToHome();
    }

    ngOnDestroy(): void {
        document.removeEventListener('keydown', this.keyPressHandler);
        this.gameSocketService.unsubscribeSocketListeners();
        sessionStorage.setItem('refreshed', 'false');
    }

    attack(): void {
        this.socketClientService.emit('performAttack', {
            accessCode: this.lobby.accessCode,
            attackerName: this.clientPlayer.name,
        });
    }

    evade(): void {
        this.socketClientService.emit('evade', { accessCode: this.lobby.accessCode, player: this.clientPlayer });
    }
    // rajouter socketService.on pr le retour du server.

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

    handlePageRefresh(): void {
        if (sessionStorage.getItem('refreshed') === 'true') {
            // if refresh abandons game
            this.abandonGame();
        } else {
            sessionStorage.setItem('refreshed', 'true');
        }
    }

    updateAttackResult(data: { success: boolean; attackScore: number; defenseScore: number } | null): void {
        this.attackResult = data;
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
    private handleKeyPress(event: KeyboardEvent): void {
        if (event.key.toLowerCase() === 'd' && this.clientPlayer.isAdmin) {
            this.socketClientService.emit('adminModeUpdate', { accessCode: this.lobby.accessCode });
        }
    }
}
