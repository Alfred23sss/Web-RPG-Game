import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { GameCombatComponent } from '@app/components/game-combat/game-combat.component';
import { DEFAULT_ESCAPE_ATTEMPTS, DELAY_MESSAGE_AFTER_COMBAT_ENDED, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { ClientNotifierMessage, LogBookEntry, SocketEvent } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { AttackScore } from '@common/interfaces/attack-score';
@Injectable({
    providedIn: 'root',
})
export class CombatSocketService {
    constructor(
        private socketClientService: SocketClientService,
        private gameStateService: GameStateSocketService,
        private clientNotifier: ClientNotifierServices,
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
        this.onCombatEndedLog();
        this.onCombatStartedLog();
    }
    private onCombatStarted(): void {
        this.socketClientService.on(SocketEvent.CombatStarted, (data: { attacker: Player; defender: Player }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.isInCombatMode = true;
            gameData.playersInFight = gameData.lobby.players.filter((p) => p.name === data.attacker.name || p.name === data.defender.name);

            this.dialog.open(GameCombatComponent, {
                disableClose: true,
                data: { gameData, attacker: data.attacker, defender: data.defender },
            });
        });
    }

    private onAttackResult(): void {
        this.socketClientService.on(SocketEvent.AttackResult, (data: { success: boolean; attackScore: AttackScore; defenseScore: AttackScore }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            this.gameplayService.updateAttackResult(gameData, data);

            const attackOutcome = data.success ? 'réussie' : 'échouée';
            const diff = data.attackScore.score - data.defenseScore.score;
            const attackScore = diff > 0 ? diff : 0;
            this.clientNotifier.addLogbookEntry(
                `${LogBookEntry.Attack} ${attackOutcome} (Dé d'Attaque: ${data.attackScore.diceRolled}, ` +
                    `Dé de Défense: ${data.defenseScore.diceRolled}, Résultat d'Attaque: ${attackScore})`,
            );

            gameData.evadeResult = null;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onCombatTurnStarted(): void {
        this.socketClientService.on(SocketEvent.CombatTurnStarted, (data: { fighter: Player; duration: number; escapeAttemptsLeft: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.actionTaken = false;
            gameData.currentPlayer = data.fighter;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onCombatTimerUpdate(): void {
        this.socketClientService.on(SocketEvent.CombatTimerUpdate, (data: { timeLeft: number }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.turnTimer = data.timeLeft;
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onEscapeAttempt(): void {
        this.socketClientService.on(SocketEvent.EscapeAttempt, (data: { attemptsLeft: number; isEscapeSuccessful: boolean; player: Player }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.evadeResult = data;
            gameData.attackResult = null;
            if (data.player.name !== gameData.clientPlayer.name) return;

            gameData.escapeAttempts = data.attemptsLeft;
            const hasEvaded = data.isEscapeSuccessful ? LogBookEntry.EvadeResultSuccess : LogBookEntry.EvadeResultFail;
            if (!data.isEscapeSuccessful) {
                this.clientNotifier.addLogbookEntry(`${LogBookEntry.EvadeAttempt} ${hasEvaded}`, [data.player]);
            }
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onCombatEnded(): void {
        this.socketClientService.on(SocketEvent.CombatEnded, (data: { winner: Player; hasEvaded: boolean }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.isInCombatMode = false;
            gameData.escapeAttempts = DEFAULT_ESCAPE_ATTEMPTS;
            gameData.isActionMode = false;
            const isWinnerEvaded = data.winner.name !== gameData.clientPlayer.name && data.hasEvaded;
            const isCurrentPlayer = gameData.clientPlayer.name === gameData.currentPlayer.name;

            if (isCurrentPlayer || isWinnerEvaded) {
                gameData.clientPlayer.actionPoints = NO_ACTION_POINTS;
            }
            gameData.clientPlayer.hp.current = gameData.clientPlayer.hp.max;
            gameData.evadeResult = null;
            gameData.attackResult = null;
            const eventToSend = data && data.winner && !data.hasEvaded ? ClientNotifierMessage.CombatWon : ClientNotifierMessage.CombatEvaded;
            this.clientNotifier.showMultipleMessages(`${data.winner.name} ${eventToSend}`, undefined, DELAY_MESSAGE_AFTER_COMBAT_ENDED);
            if (isCurrentPlayer) {
                gameData.clientPlayer.movementPoints = gameData.movementPointsRemaining;
            }
            this.gameStateService.updateGameData(gameData);
            this.gameStateService.updateClosePopup();
        });
    }

    private onCombatEndedLog(): void {
        this.socketClientService.on(
            SocketEvent.CombatEndedLog,
            (data: { winner: Player; attacker: Player; defender: Player; hasEvaded: boolean }) => {
                this.gameStateService.gameDataSubjectValue.isInCombatMode = false;
                const logbookEntry = data.hasEvaded ? LogBookEntry.CombatEvaded : LogBookEntry.CombatWon;
                this.clientNotifier.addLogbookEntry(`${logbookEntry} ${data.winner.name}`, [data.attacker, data.defender]);
            },
        );
    }

    private onCombatStartedLog(): void {
        this.socketClientService.on(SocketEvent.CombatStartedLog, (data: { attacker: Player; defender: Player }) => {
            if (this.gameStateService.gameDataSubjectValue.isInCombatMode) {
                // test this
                this.clientNotifier.addLogbookEntry(LogBookEntry.CombatStarted, [data.attacker, data.defender]);
            }
        });
    }
}
