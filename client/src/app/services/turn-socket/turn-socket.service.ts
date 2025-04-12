import { Injectable } from '@angular/core';
import { DEFAULT_ACTION_POINTS } from '@app/constants/global.constants';
import { Player } from '@app/interfaces/player';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
@Injectable({
    providedIn: 'root',
})
export class TurnSocketService {
    constructor(
        private socketClientService: SocketClientService,
        private gameStateService: GameStateSocketService,
        private clientNotifier: ClientNotifierServices,
        private gameplayService: GameplayService,
    ) {}

    initializeTurnListeners(): void {
        this.onTurnStarted();
        this.onTimerUpdate();
        this.onTransitionStarted();
        this.onGameTurnResumed();
    }

    private onTurnStarted(): void {
        this.socketClientService.on('turnStarted', (data: { player: Player; turnDuration: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            this.clientNotifier.displayMessage(`C'est à ${data.player.name} de jouer`);
            this.clientNotifier.addLogbookEntry(`C'est à ${data.player.name} de jouer`, [data.player]);
            gameData.currentPlayer = data.player;
            gameData.isCurrentlyMoving = false;
            gameData.isActionMode = false;
            gameData.isInCombatMode = false;
            if (gameData.clientPlayer.name === gameData.currentPlayer.name) {
                gameData.clientPlayer.actionPoints = DEFAULT_ACTION_POINTS;
            }
            gameData.clientPlayer.movementPoints = gameData.clientPlayer.speed;
            gameData.turnTimer = data.turnDuration;
            gameData.hasTurnEnded = gameData.clientPlayer.name !== gameData.currentPlayer.name;
            this.gameplayService.updateAvailablePath(gameData);
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onTimerUpdate(): void {
        this.socketClientService.on('timerUpdate', (data: { timeLeft: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.turnTimer = data.timeLeft;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onTransitionStarted(): void {
        this.socketClientService.on('transitionStarted', (data: { nextPlayer: Player; transitionDuration: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            this.gameplayService.closePopUp();
            this.clientNotifier.showMultipleMessages(`Le tour à ${data.nextPlayer.name} commence dans ${data.transitionDuration} secondes`);
            if (data.nextPlayer.name === gameData.clientPlayer.name) {
                gameData.clientPlayer = data.nextPlayer;
            }
            gameData.turnTimer = 0;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onGameTurnResumed(): void {
        this.socketClientService.on('gameTurnResumed', (data: { player: Player }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.currentPlayer = data.player;
            this.gameStateService.updateGameData(gameData);
        });
    }
}
