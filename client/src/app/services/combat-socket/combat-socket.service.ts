import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { GameCombatComponent } from '@app/components/game-combat/game-combat.component';
import { DEFAULT_ESCAPE_ATTEMPTS, DELAY_MESSAGE_AFTER_COMBAT_ENDED, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { Player } from '@app/interfaces/player';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
@Injectable({
    providedIn: 'root',
})
export class CombatSocketService {
    constructor(
        private socketClientService: SocketClientService,
        private gameStateService: GameStateSocketService,
        private snackbarService: SnackbarService,
        private dialog: MatDialog,
        private gameplayService: GameplayService,
    ) {}

    initializeCombatListeners(): void {
        this.onCombatStarted();
        this.onAttackResult();
        this.onCombatTurnStarted();
        this.onCombatTimerUpdate();
        this.onEscapeAttempt();
        this.onCombatEnded();
    }
    private onCombatStarted(): void {
        this.socketClientService.on('combatStarted', () => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.isInCombatMode = true;
            this.gameStateService.updateGameData(gameData);
            this.dialog.open(GameCombatComponent, {
                width: '800px',
                height: '500px',
                disableClose: true,
            });
        });
    }

    private onAttackResult(): void {
        this.socketClientService.on('attackResult', (data: { success: boolean; attackScore: number; defenseScore: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            this.gameplayService.updateAttackResult(gameData, data);
            gameData.evadeResult = null;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onCombatTurnStarted(): void {
        this.socketClientService.on('combatTurnStarted', (data: { fighter: Player; duration: number; escapeAttemptsLeft: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.currentPlayer = data.fighter;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onCombatTimerUpdate(): void {
        this.socketClientService.on('combatTimerUpdate', (data: { timeLeft: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.turnTimer = data.timeLeft;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onEscapeAttempt(): void {
        this.socketClientService.on('escapeAttempt', (data: { attemptsLeft: number; isEscapeSuccessful: boolean }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.evadeResult = data;
            gameData.attackResult = null;
            gameData.escapeAttempts = data.attemptsLeft;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onCombatEnded(): void {
        this.socketClientService.on('combatEnded', (data: { winner: Player; hasEvaded: boolean }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.isInCombatMode = false;
            gameData.escapeAttempts = DEFAULT_ESCAPE_ATTEMPTS;
            gameData.isActionMode = false;
            gameData.clientPlayer.actionPoints = NO_ACTION_POINTS;
            gameData.evadeResult = null;
            gameData.attackResult = null;
            gameData.escapeAttempts = DEFAULT_ESCAPE_ATTEMPTS;
            if (data && data.winner && !data.hasEvaded) {
                this.snackbarService.showMultipleMessages(`${data.winner.name} a gagné le combat !`, undefined, DELAY_MESSAGE_AFTER_COMBAT_ENDED);
            } else {
                this.snackbarService.showMultipleMessages(`${data.winner.name} a evadé le combat !`, undefined, DELAY_MESSAGE_AFTER_COMBAT_ENDED);
            }
            if (gameData.clientPlayer.name === gameData.currentPlayer.name) {
                gameData.clientPlayer.movementPoints = gameData.movementPointsRemaining;
            }
            this.gameStateService.updateGameData(gameData);
        });
    }
}
