import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { LogBookService } from '@app/services/logbook/logbook.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

const noActionPoints = 0;
const defaultActionPoint = 1;
const delayBeforeHome = 2000;
const delayBeforeEndingGame = 5000;
const defaultEscapeAttempts = 2;
const delayMessageAfterCombatEnded = 3000;
const events = [
    'abandonGame',
    'gameDeleted',
    'gameEnded',
    'transitionStarted',
    'turnStarted',
    'timerUpdate',
    'alertGameStarted',
    'playerMovement',
    'gameCombatStarted',
    'attackResult',
    'playerUpdate',
    'playerListUpdate',
    'doorClickedUpdate',
    'gameCombatTurnStarted',
    'gameCombatTimerUpdate',
    'gridUpdate',
    'noMoreEscapesLeft',
    'combatEnded',
    'adminModeChangedServerSide',
];

@Injectable({
    providedIn: 'root',
})
export class GameSocketService {
    constructor(
        private playerMovementService: PlayerMovementService,
        private socketClientService: SocketClientService,
        private logbookService: LogBookService,
        private snackbarService: SnackbarService,
    ) {}

    initializeSocketListeners(component: GamePageComponent): void {
        component.handlePageRefresh();

        const lobby = sessionStorage.getItem('lobby');
        component.lobby = lobby ? (JSON.parse(lobby) as Lobby) : component.lobby;
        const clientPlayer = sessionStorage.getItem('player');
        component.clientPlayer = clientPlayer ? (JSON.parse(clientPlayer) as Player) : component.clientPlayer;
        component.playerList = JSON.parse(sessionStorage.getItem('orderedPlayers') || '[]');
        const game = sessionStorage.getItem('game');
        component.game = game ? (JSON.parse(game) as Game) : component.game;

        this.socketClientService.on('game-abandoned', (data: { player: Player }) => {
            const abandonedPlayer = component.playerList.find((p) => p.name === data.player.name);
            if (!abandonedPlayer) return;
            abandonedPlayer.hasAbandoned = true;
            component.lobby.players = component.lobby.players.filter((p) => p.name !== data.player.name);
            this.logbookService.addEntry(`${data.player.name} a abandonné la partie`, [abandonedPlayer]);
        });

        this.socketClientService.on('gameDeleted', () => {
            this.snackbarService.showMessage("Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil");
            setTimeout(() => {
                component.backToHome();
            }, delayBeforeHome);
        });

        this.socketClientService.on('gameEnded', (data: { winner: string }) => {
            this.snackbarService.showMessage(`👑 ${data.winner} a remporté la partie ! Redirection vers l'accueil sous peu`);
            setTimeout(() => {
                component.abandonGame();
            }, delayBeforeEndingGame);
        });

        this.socketClientService.on('adminModeDisabled', () => {
            if (component.isDebugMode) {
                this.snackbarService.showMessage("Mode debug 'désactivé'");
            }
            component.isDebugMode = false;
        });

        this.socketClientService.on('transitionStarted', (data: { nextPlayer: Player; transitionDuration: number }) => {
            this.snackbarService.showMultipleMessages(`Le tour à ${data.nextPlayer.name} commence dans ${data.transitionDuration} secondes`);
            if (data.nextPlayer.name === component.clientPlayer.name) {
                component.clientPlayer = data.nextPlayer;
            }
        });

        this.socketClientService.on('turnStarted', (data: { player: Player; turnDuration: number }) => {
            this.snackbarService.showMessage(`C'est à ${data.player.name} de jouer`);
            component.currentPlayer = data.player;
            component.isCurrentlyMoving = false;
            component.isActionMode = false;
            component.isInCombatMode = false;
            component.clientPlayer.actionPoints = defaultActionPoint;
            component.clientPlayer.movementPoints = component.clientPlayer.speed;
            component.turnTimer = data.turnDuration;
            component.updateAvailablePath();
        });

        this.socketClientService.on('timerUpdate', (data: { timeLeft: number }) => {
            component.turnTimer = data.timeLeft;
        });

        this.socketClientService.socket.on('gameStarted', (data: { orderedPlayers: Player[]; updatedGame: Game }) => {
            component.playerList = data.orderedPlayers;
            component.game = data.updatedGame;
        });

        this.socketClientService.on('playerMovement', (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => {
            if (component.game && component.game.grid) {
                component.game.grid = data.grid;
            }
            if (component.clientPlayer.name === data.player.name) {
                component.clientPlayer.movementPoints =
                    component.clientPlayer.movementPoints -
                    this.playerMovementService.calculateRemainingMovementPoints(component.getClientPlayerPosition(), data.player);
                component.movementPointsRemaining = component.clientPlayer.movementPoints;
                component.isCurrentlyMoving = data.isCurrentlyMoving;
                component.updateAvailablePath();
            }

            const clientPlayerPosition = component.getClientPlayerPosition();
            if (!clientPlayerPosition) return;
            const hasIce = this.playerMovementService.hasAdjacentIce(clientPlayerPosition, data.grid);
            const hasActionAvailable = this.playerMovementService.hasAdjacentPlayerOrDoor(clientPlayerPosition, data.grid);
            if (component.clientPlayer.actionPoints === 0 && component.clientPlayer.movementPoints === 0) {
                if (!hasIce) {
                    component.endTurn();
                }
            } else if (component.clientPlayer.actionPoints === 1 && component.clientPlayer.movementPoints === 0) {
                if (!hasIce && !hasActionAvailable) {
                    component.endTurn();
                }
            }
        });

        this.socketClientService.on('combatStarted', () => {
            component.isInCombatMode = true;
        });

        this.socketClientService.on('attackResult', (data: { success: boolean; attackScore: number; defenseScore: number }) => {
            component.updateAttackResult(data);
        });

        this.socketClientService.on('playerUpdate', (data: { player: Player }) => {
            if (component.clientPlayer.name === data.player.name) {
                component.clientPlayer = data.player;
            }
        });

        this.socketClientService.on('playerListUpdate', (data: { players: Player[] }) => {
            component.playerList = data.players;
        });

        this.socketClientService.on('doorClicked', (data: { grid: Tile[][] }) => {
            if (!component.game || !component.game.grid) {
                return;
            }
            component.game.grid = data.grid;
            component.clientPlayer.actionPoints = noActionPoints;
            component.isActionMode = false;
            component.updateAvailablePath();
        });

        this.socketClientService.on('combatTurnStarted', (data: { fighter: Player; duration: number; escapeAttemptsLeft: number }) => {
            component.currentPlayer = data.fighter;
        });

        this.socketClientService.on('combatTimerUpdate', (data: { timeLeft: number }) => {
            component.turnTimer = data.timeLeft;
        });

        this.socketClientService.on('gridUpdate', (data: { grid: Tile[][] }) => {
            if (!component.game || !component.game.grid) {
                return;
            }
            component.game.grid = data.grid;
        });

        this.socketClientService.on('noMoreEscapesLeft', (data: { player: Player; attemptsLeft: number }) => {
            component.escapeAttempts = data.attemptsLeft;
        });

        this.socketClientService.on('combatEnded', (data: { winner: Player; hasEvaded: boolean }) => {
            component.isInCombatMode = false;
            component.escapeAttempts = defaultEscapeAttempts;
            component.isActionMode = false;
            component.clientPlayer.actionPoints = noActionPoints;
            component.attackResult = null;
            component.escapeAttempts = defaultEscapeAttempts;
            if (data && data.winner && !data.hasEvaded) {
                this.snackbarService.showMultipleMessages(`${data.winner.name} a gagné le combat !`, undefined, delayMessageAfterCombatEnded);
            } else {
                this.snackbarService.showMultipleMessages(`${data.winner.name} a evadé le combat !`, undefined, delayMessageAfterCombatEnded);
            }
            if (component.clientPlayer.name === component.currentPlayer.name) {
                component.clientPlayer.movementPoints = component.movementPointsRemaining;
            }
            const clientPlayerPosition = component.getClientPlayerPosition();
            if (!clientPlayerPosition || !component.game || !component.game.grid) return;
            const hasIce = this.playerMovementService.hasAdjacentIce(clientPlayerPosition, component.game.grid);
            const hasActionAvailable = this.playerMovementService.hasAdjacentPlayerOrDoor(clientPlayerPosition, component.game.grid);
            if (component.clientPlayer.actionPoints === 0 && component.clientPlayer.movementPoints === 0) {
                if (!hasIce) {
                    component.endTurn();
                }
            } else if (component.clientPlayer.actionPoints === 1 && component.clientPlayer.movementPoints === 0) {
                if (!hasIce && !hasActionAvailable) {
                    component.endTurn();
                }
            }
        });

        this.socketClientService.on('adminModeChangedServerSide', () => {
            component.isDebugMode = !component.isDebugMode;
            this.snackbarService.showMessage(`Mode debug ${component.isDebugMode ? 'activé' : 'désactivé'}`);
        });
    }

    unsubscribeSocketListeners(): void {
        events.forEach((event) => {
            this.socketClientService.socket.off(event);
        });
    }
}
