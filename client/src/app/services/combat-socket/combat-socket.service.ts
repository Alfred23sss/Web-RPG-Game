import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { GameCombatComponent } from '@app/components/game-combat/game-combat.component';
import { DEFAULT_ESCAPE_ATTEMPTS, DELAY_MESSAGE_AFTER_COMBAT_ENDED, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { AttackScore } from '@app/interfaces/attack-score';
import { Player } from '@app/interfaces/player';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
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
        this.socketClientService.on('combatStarted', (data: { attacker: Player; defender: Player }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.isInCombatMode = true;
            gameData.playersInFight = gameData.lobby.players.filter((p) => p.name === data.attacker.name || p.name === data.defender.name);
            this.clientNotifier.addLogbookEntry('Combat commencé!', [data.attacker, data.defender]);

            this.dialog.open(GameCombatComponent, {
                disableClose: true,
                data: { gameData, attacker: data.attacker, defender: data.defender },
            });
        });
    }

    private onAttackResult(): void {
        this.socketClientService.on('attackResult', (data: { success: boolean; attackScore: AttackScore; defenseScore: AttackScore }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            this.gameplayService.updateAttackResult(gameData, data);

            const attackOutcome = data.success ? 'réussie' : 'échouée';
            this.clientNotifier.addLogbookEntry(`Attaque ${attackOutcome} (Attaque: ${data.attackScore}, Défense: ${data.defenseScore})`);

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
            const hasEvaded = data.isEscapeSuccessful ? 'réussi' : 'raté';
            this.clientNotifier.addLogbookEntry(`Tentative d'évasion ${hasEvaded}`, []); // pt rajoute nom joueur ici
            this.gameStateService.updateGameData(gameData);
        });
    }

    private onCombatEnded(): void {
        this.socketClientService.on('combatEnded', (data: { winner: Player; hasEvaded: boolean }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            gameData.isInCombatMode = false;
            gameData.escapeAttempts = DEFAULT_ESCAPE_ATTEMPTS;
            gameData.isActionMode = false;
            if (gameData.clientPlayer.name === gameData.currentPlayer.name) {
                gameData.clientPlayer.actionPoints = NO_ACTION_POINTS;
            }
            gameData.evadeResult = null;
            gameData.attackResult = null;
            if (data && data.winner && !data.hasEvaded) {
                this.clientNotifier.showMultipleMessages(`${data.winner.name} a gagné le combat !`, undefined, DELAY_MESSAGE_AFTER_COMBAT_ENDED);
            } else {
                this.clientNotifier.showMultipleMessages(`${data.winner.name} a evadé le combat !`, undefined, DELAY_MESSAGE_AFTER_COMBAT_ENDED);
            }
            if (gameData.clientPlayer.name === gameData.currentPlayer.name) {
                gameData.clientPlayer.movementPoints = gameData.movementPointsRemaining;
            }
            this.gameStateService.updateGameData(gameData);
            this.gameStateService.updateClosePopup();
        });
    }

    private onCombatEndedLog(): void {
        this.socketClientService.on('combatEndedLog', (data: { winner: Player; attacker: Player; defender: Player; hasEvaded: boolean }) => {
            if (!data.hasEvaded) {
                this.clientNotifier.addLogbookEntry(`Combat gagné par ${data.winner.name}`, [data.attacker, data.defender]);
            } else {
                this.clientNotifier.addLogbookEntry(`Combat évadé par ${data.winner.name}`, [data.attacker, data.defender]);
            }
        });
    }

    private onCombatStartedLog(): void {
        this.socketClientService.on('combatStartedLog', (data: { attacker: Player; defender: Player }) => {
            this.clientNotifier.addLogbookEntry('Combat commencé', [data.attacker, data.defender]);
        });
    }
}
