import { Injectable } from '@angular/core';
import { DEFAULT_ACTION_POINTS } from '@app/constants/global.constants';
import { ClientNotifierMessage, SocketEvent } from '@app/enums/global.enums';
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
        this.socketClientService.on(SocketEvent.TurnStarted, (data: { player: Player; turnDuration: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            const message = `${ClientNotifierMessage.PlayerTurnStart} ${data.player.name} ${ClientNotifierMessage.PlayerTurnEnd}`;
            this.clientNotifier.displayMessage(message);
            this.clientNotifier.addLogbookEntry(message, [data.player]);

            gameData.currentPlayer = data.player;
            gameData.isCurrentlyMoving = false;
            gameData.isActionMode = false;
            gameData.isInCombatMode = false;
            gameData.clientPlayer.actionPoints = DEFAULT_ACTION_POINTS;
            gameData.clientPlayer.movementPoints = gameData.clientPlayer.speed;
            gameData.movementPointsRemaining = gameData.clientPlayer.speed;
            gameData.turnTimer = data.turnDuration;
            gameData.hasTurnEnded = gameData.clientPlayer.name !== gameData.currentPlayer.name;

            this.gameplayService.updateAvailablePath(gameData);
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onTimerUpdate(): void {
        this.socketClientService.on(SocketEvent.TimerUpdate, (data: { timeLeft: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.turnTimer = data.timeLeft;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onTransitionStarted(): void {
        this.socketClientService.on(SocketEvent.TransitionStarted, (data: { nextPlayer: Player; transitionDuration: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.hasTurnEnded = true;
            this.gameplayService.closePopUp();

            const message =
                `${ClientNotifierMessage.TurnStartingStart} ${data.nextPlayer.name} ` +
                `${ClientNotifierMessage.TurnStartingMiddle} ${data.transitionDuration} ` +
                `${ClientNotifierMessage.TurnStartingEnd}`;

            this.clientNotifier.showMultipleMessages(message);

            if (data.nextPlayer.name === gameData.clientPlayer.name) {
                gameData.clientPlayer = data.nextPlayer;
            }

            gameData.turnTimer = 0;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onGameTurnResumed(): void {
        this.socketClientService.on(SocketEvent.GameTurnResumed, (data: { player: Player }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.currentPlayer = data.player;
            this.gameStateService.updateGameData(gameData);
        });
    }
}
