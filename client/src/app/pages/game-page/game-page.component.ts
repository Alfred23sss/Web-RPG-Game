import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameData } from '@app/classes/gameData';
import { GridComponent } from '@app/components/grid/grid.component';
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
    gameData: GameData = new GameData();
    activeTab: 'chat' | 'log' = 'chat';
    private keyPressHandler: (event: KeyboardEvent) => void;
    private gameDataSubscription: Subscription;

    constructor(
        private playerMovementService: PlayerMovementService,
        private socketClientService: SocketClientService,
        private snackbarService: SnackbarService,
        private gameSocketService: GameSocketService,
    ) {}

    ngOnInit(): void {
        this.gameDataSubscription = this.gameSocketService.gameData$.subscribe((data) => {
            this.gameData = data;
        });

        this.gameSocketService.initializeSocketListeners();
        this.keyPressHandler = this.handleKeyPress.bind(this);
        document.addEventListener('keydown', this.keyPressHandler);
    }

    handleDoorClick(targetTile: Tile): void {
        if (this.gameData.isInCombatMode || this.gameData.clientPlayer.actionPoints === noActionPoints || !this.gameData.isActionMode) return;
        const currentTile = this.gameSocketService.getClientPlayerPosition();
        if (!currentTile || !this.gameData.game || !this.gameData.game.grid) {
            return;
        }
        this.socketClientService.emit('doorUpdate', {
            currentTile,
            targetTile,
            accessCode: this.gameData.lobby.accessCode,
        });
    }

    handleAttackClick(targetTile: Tile): void {
        if (!targetTile.player || targetTile.player === this.gameData.clientPlayer || this.gameData.clientPlayer.actionPoints === noActionPoints)
            return;
        const currentTile = this.gameSocketService.getClientPlayerPosition();

        if (this.gameData.isActionMode && currentTile && currentTile.player && this.gameData.game && this.gameData.game.grid) {
            if (this.findAndCheckAdjacentTiles(targetTile.id, currentTile.id, this.gameData.game.grid)) {
                this.socketClientService.emit('startCombat', {
                    attackerName: currentTile.player.name,
                    defenderName: targetTile.player.name,
                    accessCode: this.gameData.lobby.accessCode,
                    isDebugMode: this.gameData.isDebugMode,
                });
                return;
            }
        }
    }

    handleTileClick(targetTile: Tile): void {
        if (this.gameData.isActionMode || this.gameData.isCurrentlyMoving) return;
        const currentTile = this.gameSocketService.getClientPlayerPosition();
        if (!currentTile || !this.gameData.game || !this.gameData.game.grid) {
            return;
        }
        this.socketClientService.sendPlayerMovementUpdate(currentTile, targetTile, this.gameData.lobby.accessCode, this.gameData.game.grid);
    }

    handleTeleport(targetTile: Tile): void {
        if (this.gameData.isInCombatMode) return;
        if (this.gameData.clientPlayer.name === this.gameData.currentPlayer.name) {
            this.socketClientService.emit('teleportPlayer', {
                accessCode: this.gameData.lobby.accessCode,
                player: this.gameData.clientPlayer,
                targetTile,
            });
        }
    }
    updateQuickestPath(targetTile: Tile): void {
        if (!(this.gameData.game && this.gameData.game.grid) || !this.isAvailablePath(targetTile)) {
            this.gameData.quickestPath = undefined;
        } else {
            this.gameData.quickestPath =
                this.playerMovementService.quickestPath(this.gameSocketService.getClientPlayerPosition(), targetTile, this.gameData.game.grid) || [];
        }
    }

    endTurn(): void {
        this.gameSocketService.endTurn();
    }

    executeNextAction(): void {
        this.gameData.isActionMode = !this.gameData.isActionMode;
        const message = this.gameData.isActionMode ? 'Mode action activé' : 'Mode action désactivé';
        this.snackbarService.showMessage(message);
    }

    abandonGame(): void {
        this.gameSocketService.abandonGame();
    }

    ngOnDestroy(): void {
        if (this.gameDataSubscription) {
            this.gameDataSubscription.unsubscribe();
        }
        document.removeEventListener('keydown', this.keyPressHandler);
        this.gameSocketService.unsubscribeSocketListeners();
        sessionStorage.setItem('refreshed', 'false');
    }

    attack(): void {
        this.socketClientService.emit('performAttack', {
            accessCode: this.gameData.lobby.accessCode,
            attackerName: this.gameData.clientPlayer.name,
        });
    }

    evade(): void {
        this.socketClientService.emit('evade', { accessCode: this.gameData.lobby.accessCode, player: this.gameData.clientPlayer });
    }

    updateAttackResult(data: { success: boolean; attackScore: number; defenseScore: number } | null): void {
        this.gameData.attackResult = data;
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
        return this.gameData.availablePath ? this.gameData.availablePath.some((t) => t.id === tile.id) : false;
    }
    private handleKeyPress(event: KeyboardEvent): void {
        if (event.key.toLowerCase() === 'd' && this.gameData.clientPlayer.isAdmin) {
            this.socketClientService.emit('adminModeUpdate', { accessCode: this.gameData.lobby.accessCode });
        }
    }
}
