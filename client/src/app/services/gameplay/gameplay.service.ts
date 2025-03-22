import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/gameData';
import { Routes } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Injectable({
    providedIn: 'root',
})
export class GameplayService {
    constructor(
        private playerMovementService: PlayerMovementService,
        private socketClientService: SocketClientService,
        private router: Router,
    ) {}

    endTurn(gameData: GameData): void {
        gameData.hasTurnEnded = true;
        gameData.turnTimer = 0;
        this.socketClientService.emit('endTurn', { accessCode: gameData.lobby.accessCode });
    }

    abandonGame(gameData: GameData): void {
        gameData.clientPlayer.hasAbandoned = true;
        this.socketClientService.emit('abandonedGame', { player: gameData.clientPlayer, accessCode: gameData.lobby.accessCode });
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
    updateAttackResult(gameData: GameData, data: { success: boolean; attackScore: number; defenseScore: number } | null): void {
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
        const clientPlayerPosition = this.getClientPlayerPosition(gameData);
        if (!clientPlayerPosition || !gameData.game || !gameData.game.grid) return;
        const hasIce = this.playerMovementService.hasAdjacentIce(clientPlayerPosition, gameData.game.grid);
        const hasActionAvailable = this.playerMovementService.hasAdjacentPlayerOrDoor(clientPlayerPosition, gameData.game.grid);
        if (gameData.clientPlayer.actionPoints === 0 && gameData.clientPlayer.movementPoints === 0) {
            if (!hasIce) {
                this.endTurn(gameData);
            }
        } else if (gameData.clientPlayer.actionPoints === 1 && gameData.clientPlayer.movementPoints === 0) {
            if (!hasIce && !hasActionAvailable) {
                this.endTurn(gameData);
            }
        }
    }
}
