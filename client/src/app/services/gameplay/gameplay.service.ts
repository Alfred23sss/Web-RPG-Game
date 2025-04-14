import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/game-data';
import { Item } from '@app/classes/item';
import { ItemPopUpComponent } from '@app/components/item-pop-up/item-pop-up.component';
import { NO_ACTION_POINTS } from '@app/constants/global.constants';
import { Routes, TileType } from '@app/enums/global.enums';
import { AttackScore } from '@app/interfaces/attack-score';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { ItemName } from '@common/enums';

@Injectable({
    providedIn: 'root',
})
export class GameplayService {
    constructor(
        private readonly playerMovementService: PlayerMovementService,
        private readonly socketClientService: SocketClientService,
        private readonly snackBarService: SnackbarService,
        private readonly router: Router,
        private dialog: MatDialog,
    ) {}

    createItemPopUp(items: [Item, Item, Item], gameData: GameData): void {
        if (this.dialog.openDialogs.length > 0) return;
        const dialogRef = this.dialog.open(ItemPopUpComponent, {
            data: { items },
            panelClass: 'item-pop-up-dialog',
            hasBackdrop: false,
        });

        dialogRef.afterClosed().subscribe((selectedItem: Item | undefined) => {
            if (selectedItem) {
                this.handleItemDropped(gameData, selectedItem);
                this.checkAvailableActions(gameData);
            }
            if (selectedItem === items[2]) {
                this.socketClientService.emit('decrement.item', {
                    selectedItem,
                    accessCode: gameData.lobby.accessCode,
                    player: gameData.clientPlayer,
                });
            }
        });
    }

    closePopUp(): void {
        this.dialog.closeAll();
    }

    endTurn(gameData: GameData): void {
        gameData.hasTurnEnded = true;
        gameData.turnTimer = 0;
        this.socketClientService.emit('endTurn', { accessCode: gameData.lobby.accessCode });
    }

    abandonGame(gameData: GameData): void {
        gameData.clientPlayer.hasAbandoned = true;
        gameData.turnTimer = 0;
        this.socketClientService.emit('manualDisconnect', { isInGame: true });
        this.backToHome();
    }

    getClientPlayerPosition(gameData: GameData): Tile | undefined {
        if (!gameData.game || !gameData.game.grid || !gameData.clientPlayer) {
            return undefined;
        }
        for (const row of gameData.game.grid) {
            for (const tile of row) {
                if (tile.player && tile.player.name === gameData.clientPlayer.name) {
                    return tile;
                }
            }
        }
        return undefined;
    }

    backToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    navigateToFinalPage(): void {
        this.router.navigate([Routes.GameEndPage], {});
    }

    updateAttackResult(gameData: GameData, data: { success: boolean; attackScore: AttackScore; defenseScore: AttackScore } | null): void {
        gameData.attackResult = data;
    }

    updateAvailablePath(gameData: GameData): void {
        if (gameData.currentPlayer.name === gameData.clientPlayer.name && gameData.game && gameData.game.grid) {
            gameData.availablePath = this.playerMovementService.availablePath(
                this.getClientPlayerPosition(gameData),
                gameData.clientPlayer.movementPoints,
                gameData.game.grid,
            );
        } else {
            gameData.availablePath = [];
        }
    }

    checkAvailableActions(gameData: GameData): void {
        if (this.dialog.openDialogs.length > 0) {
            return;
        }
        const clientPlayerPosition = this.getClientPlayerPosition(gameData);
        if (!clientPlayerPosition || !gameData.game || !gameData.game.grid) return;
        const hasIce = this.playerMovementService.hasAdjacentTileType(clientPlayerPosition, gameData.game.grid, TileType.Ice);
        const hasWall = this.playerMovementService.hasAdjacentTileType(clientPlayerPosition, gameData.game.grid, TileType.Wall);
        const hasLightning = clientPlayerPosition.player?.inventory.some((item) => item?.name === ItemName.Lightning);
        const hasActionAvailable = this.playerMovementService.hasAdjacentPlayerOrDoor(clientPlayerPosition, gameData.game.grid);
        if (gameData.clientPlayer.actionPoints === 0 && gameData.clientPlayer.movementPoints === 0) {
            if (!hasIce) {
                this.endTurn(gameData);
            }
        } else if (gameData.clientPlayer.actionPoints === 1 && gameData.clientPlayer.movementPoints === 0) {
            if (!hasIce && !hasActionAvailable && (!hasLightning || !hasWall)) {
                this.endTurn(gameData);
            }
        }
    }

    handleDoorClick(gameData: GameData, targetTile: Tile): void {
        const currentTile = this.validateAction(gameData);
        if (!currentTile) return;

        this.socketClientService.emit('doorUpdate', {
            currentTile,
            targetTile,
            accessCode: gameData.lobby.accessCode,
        });
    }

    handleWallClick(gameData: GameData, targetTile: Tile, player: Player): void {
        const currentTile = this.validateAction(gameData);
        if (!currentTile) return;

        if (gameData.clientPlayer.inventory.some((item) => item?.name === ItemName.Lightning)) {
            this.socketClientService.emit('wallUpdate', {
                currentTile,
                targetTile,
                accessCode: gameData.lobby.accessCode,
                player,
            });
        }
    }

    handleAttackCTF(gameData: GameData, targetTile: Tile) {
        if (!targetTile.player || targetTile.player === gameData.clientPlayer || gameData.clientPlayer.actionPoints === NO_ACTION_POINTS) return;
        const currentTile = this.getClientPlayerPosition(gameData);
        if (gameData.isActionMode && currentTile && currentTile.player && gameData.game && gameData.game.grid) {
            if (this.isTeamate(targetTile.player.name, currentTile.player.name, gameData)) {
                this.snackBarService.showMessage("TRAITRE!!! C'EST MOI TON AMI");
                return;
            } else if (this.findAndCheckAdjacentTiles(targetTile.id, currentTile.id, gameData.game.grid)) {
                this.socketClientService.emit('startCombat', {
                    attackerName: currentTile.player.name,
                    defenderName: targetTile.player.name,
                    accessCode: gameData.lobby.accessCode,
                    isDebugMode: gameData.isDebugMode,
                });
                return;
            }
        }
    }

    handleAttackClick(gameData: GameData, targetTile: Tile): void {
        if (!targetTile.player || targetTile.player === gameData.clientPlayer || gameData.clientPlayer.actionPoints === NO_ACTION_POINTS) return;
        if (gameData.game.mode === 'CTF') {
            this.handleAttackCTF(gameData, targetTile);
            return;
        }
        const currentTile = this.getClientPlayerPosition(gameData);

        if (gameData.isActionMode && currentTile && currentTile.player && gameData.game && gameData.game.grid) {
            if (this.findAndCheckAdjacentTiles(targetTile.id, currentTile.id, gameData.game.grid)) {
                this.socketClientService.emit('startCombat', {
                    attackerName: currentTile.player.name,
                    defenderName: targetTile.player.name,
                    accessCode: gameData.lobby.accessCode,
                    isDebugMode: gameData.isDebugMode,
                });
                return;
            }
        }
    }

    handleTileClick(gameData: GameData, targetTile: Tile): void {
        if (gameData.isActionMode || gameData.isCurrentlyMoving) return;
        const currentTile = this.getClientPlayerPosition(gameData);
        if (!currentTile || !gameData.game || !gameData.game.grid) {
            return;
        }
        this.socketClientService.sendPlayerMovementUpdate(currentTile, targetTile, gameData.lobby.accessCode, gameData.game.grid);
    }

    handleTeleport(gameData: GameData, targetTile: Tile): void {
        if (gameData.isInCombatMode) return;
        if (gameData.clientPlayer.name === gameData.currentPlayer.name) {
            this.socketClientService.emit('teleportPlayer', {
                accessCode: gameData.lobby.accessCode,
                player: gameData.clientPlayer,
                targetTile,
            });
        }
    }

    handleItemDropped(gameData: GameData, item: Item) {
        this.socketClientService.emit('itemDrop', {
            accessCode: gameData.lobby.accessCode,
            player: gameData.clientPlayer,
            item,
        });
    }

    updateQuickestPath(gameData: GameData, targetTile: Tile): void {
        if (!(gameData.game && gameData.game.grid) || !this.isAvailablePath(gameData, targetTile)) {
            gameData.quickestPath = undefined;
        } else {
            gameData.quickestPath =
                this.playerMovementService.quickestPath(this.getClientPlayerPosition(gameData), targetTile, gameData.game.grid) || [];
        }
    }

    executeNextAction(gameData: GameData): void {
        gameData.isActionMode = !gameData.isActionMode;
        const message = gameData.isActionMode ? 'Mode action activé' : 'Mode action désactivé';
        this.snackBarService.showMessage(message);
    }

    attack(gameData: GameData): void {
        this.socketClientService.emit('performAttack', {
            accessCode: gameData.lobby.accessCode,
            attackerName: gameData.clientPlayer.name,
        });
    }

    evade(gameData: GameData): void {
        this.socketClientService.emit('evade', { accessCode: gameData.lobby.accessCode, player: gameData.clientPlayer });
    }

    handleKeyPress(gameData: GameData, event: KeyboardEvent): void {
        if (event.key.toLowerCase() === 'd' && gameData.clientPlayer.isAdmin) {
            this.socketClientService.emit('adminModeUpdate', { accessCode: gameData.lobby.accessCode });
        }
    }

    emitAdminModeUpdate(gameData: GameData): void {
        this.socketClientService.emit('adminModeUpdate', { accessCode: gameData.lobby.accessCode });
    }

    private validateAction(gameData: GameData): Tile | undefined {
        if (gameData.isInCombatMode || gameData.clientPlayer.actionPoints === NO_ACTION_POINTS || !gameData.isActionMode) {
            return undefined;
        }

        const currentTile = this.getClientPlayerPosition(gameData);
        if (!currentTile || !gameData.game?.grid) {
            return undefined;
        }

        return currentTile;
    }

    private isAvailablePath(gameData: GameData, tile: Tile): boolean {
        return gameData.availablePath ? gameData.availablePath.some((t) => t.id === tile.id) : false;
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

    private isTeamate(defenderPlayer: string, attackerPlayer: string, gameData: GameData): boolean {
        const players = gameData.lobby.players;
        const defender = players.find((p) => p.name === defenderPlayer);
        const attacker = players.find((p) => p.name === attackerPlayer);
        return attacker?.team === defender?.team;
    }
}
