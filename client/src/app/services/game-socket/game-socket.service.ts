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

        this.socketClientService.onAbandonGame((data: { player: Player }) => {
            const abandonedPlayer = component.playerList.find((p) => p.name === data.player.name);
            if (!abandonedPlayer) return;
            abandonedPlayer.hasAbandoned = true;
            this.logbookService.addEntry(`${data.player.name} a abandonné la partie`, [abandonedPlayer]);
            component.backToHome();
        });

        this.socketClientService.onGameDeleted(() => {
            this.snackbarService.showMessage("Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil");
            setTimeout(() => {
                component.backToHome();
            }, delayBeforeHome);
        });

        this.socketClientService.onGameEnded((data) => {
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

        this.socketClientService.onTransitionStarted((data: { nextPlayer: Player; transitionDuration: number }) => {
            this.snackbarService.showMessage(`Le tour à ${data.nextPlayer.name} commence dans ${data.transitionDuration} secondes`);
            if (data.nextPlayer.name === component.clientPlayer.name) {
                component.clientPlayer = data.nextPlayer;
            }
        });

        this.socketClientService.onTurnStarted((data: { player: Player; turnDuration: number }) => {
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

        this.socketClientService.onTimerUpdate((data: { timeLeft: number }) => {
            component.turnTimer = data.timeLeft;
        });

        this.socketClientService.onAlertGameStarted((data: { orderedPlayers: Player[]; updatedGame: Game }) => {
            component.playerList = data.orderedPlayers;
            component.game = data.updatedGame;
        });

        this.socketClientService.onPlayerMovement((data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => {
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
        });

        this.socketClientService.onGameCombatStarted(() => {
            component.isInCombatMode = true;
        });

        this.socketClientService.onAttackResult((data: { success: boolean; attackScore: number; defenseScore: number }) => {
            component.updateAttackResult(data);
        });

        this.socketClientService.onPlayerUpdate((data: { player: Player }) => {
            if (component.clientPlayer.name === data.player.name) {
                component.clientPlayer = data.player;
            }
        });

        this.socketClientService.onPlayerListUpdate((data: { players: Player[] }) => {
            component.playerList = data.players;
        });

        this.socketClientService.onDoorClickedUpdate((data: { grid: Tile[][] }) => {
            if (!component.game || !component.game.grid) {
                return;
            }
            component.game.grid = data.grid;
            component.clientPlayer.actionPoints = noActionPoints;
            component.isActionMode = false;
            component.updateAvailablePath();
        });

        this.socketClientService.onGameCombatTurnStarted((data: { fighter: Player }) => {
            component.currentPlayer = data.fighter;
        });

        this.socketClientService.onGameCombatTimerUpdate((data: { timeLeft: number }) => {
            component.turnTimer = data.timeLeft;
        });

        this.socketClientService.onGridUpdate((data: { grid: Tile[][] }) => {
            if (!component.game || !component.game.grid) {
                return;
            }
            component.game.grid = data.grid;
        });

        this.socketClientService.on('noMoreEscapesLeft', (data: { player: Player; attemptsLeft: number }) => {
            component.escapeAttempts = data.attemptsLeft;
        });

        this.socketClientService.on('combatEnded', () => {
            component.escapeAttempts = defaultEscapeAttempts;
            component.isInCombatMode = false;
            component.isActionMode = false;
            component.clientPlayer.actionPoints = noActionPoints;
            component.attackResult = null;
            if (component.clientPlayer.name === component.currentPlayer.name) {
                component.clientPlayer.movementPoints = component.movementPointsRemaining;
            }
        });
        this.socketClientService.on('adminModeChangedServerSide', () => {
            component.isDebugMode = !component.isDebugMode;
            this.snackbarService.showMessage(`Mode debug ${component.isDebugMode ? 'activé' : 'désactivé'}`);
        });
    }
}
