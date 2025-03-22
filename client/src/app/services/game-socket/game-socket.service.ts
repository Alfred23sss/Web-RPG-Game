import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/gameData';
import { Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject, Observable } from 'rxjs';

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
    private gameData = new GameData();
    private gameDataSubject = new BehaviorSubject<GameData>(this.gameData);

    constructor(
        private playerMovementService: PlayerMovementService,
        private socketClientService: SocketClientService,
        private snackbarService: SnackbarService,
        private router: Router,
    ) {}

    get gameData$(): Observable<GameData> {
        return this.gameDataSubject.asObservable();
    }

    initializeSocketListeners(): void {
        this.handlePageRefresh();

        const lobby = sessionStorage.getItem('lobby');
        this.gameData.lobby = lobby ? (JSON.parse(lobby) as Lobby) : this.gameData.lobby;
        const clientPlayer = sessionStorage.getItem('player');
        this.gameData.clientPlayer = clientPlayer ? (JSON.parse(clientPlayer) as Player) : this.gameData.clientPlayer;
        this.gameData.lobby.players = JSON.parse(sessionStorage.getItem('orderedPlayers') || '[]');
        const game = sessionStorage.getItem('game');
        this.gameData.game = game ? (JSON.parse(game) as Game) : this.gameData.game;

        this.gameDataSubject.next(this.gameData);

        this.socketClientService.on('game-abandoned', (data: { player: Player }) => {
            const abandonedPlayer = this.gameData.lobby.players.find((p) => p.name === data.player.name);
            if (!abandonedPlayer) return;
            abandonedPlayer.hasAbandoned = true;
            this.gameData.lobby.players = this.gameData.lobby.players.filter((p) => p.name !== data.player.name);
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('gameDeleted', () => {
            this.snackbarService.showMessage("Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil");
            setTimeout(() => {
                this.backToHome();
            }, delayBeforeHome);
        });

        this.socketClientService.on('gameEnded', (data: { winner: string }) => {
            this.snackbarService.showMessage(`👑 ${data.winner} a remporté la partie ! Redirection vers l'accueil sous peu`);
            setTimeout(() => {
                this.abandonGame();
            }, delayBeforeEndingGame);
        });

        this.socketClientService.on('adminModeDisabled', () => {
            if (this.gameData.isDebugMode) {
                this.snackbarService.showMessage("Mode debug 'désactivé'");
            }
            this.gameData.isDebugMode = false;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('transitionStarted', (data: { nextPlayer: Player; transitionDuration: number }) => {
            this.snackbarService.showMultipleMessages(`Le tour à ${data.nextPlayer.name} commence dans ${data.transitionDuration} secondes`);
            if (data.nextPlayer.name === this.gameData.clientPlayer.name) {
                this.gameData.clientPlayer = data.nextPlayer;
            }
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('turnStarted', (data: { player: Player; turnDuration: number }) => {
            this.snackbarService.showMessage(`C'est à ${data.player.name} de jouer`);
            this.gameData.currentPlayer = data.player;
            this.gameData.isCurrentlyMoving = false;
            this.gameData.isActionMode = false;
            this.gameData.isInCombatMode = false;
            this.gameData.clientPlayer.actionPoints = defaultActionPoint;
            this.gameData.clientPlayer.movementPoints = this.gameData.clientPlayer.speed;
            this.gameData.turnTimer = data.turnDuration;
            this.gameData.hasTurnEnded = this.gameData.clientPlayer.name !== this.gameData.currentPlayer.name;
            this.updateAvailablePath();
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('timerUpdate', (data: { timeLeft: number }) => {
            this.gameData.turnTimer = data.timeLeft;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.socket.on('gameStarted', (data: { orderedPlayers: Player[]; updatedGame: Game }) => {
            this.gameData.lobby.players = data.orderedPlayers;
            this.gameData.game = data.updatedGame;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('playerMovement', (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => {
            if (this.gameData.game && this.gameData.game.grid) {
                this.gameData.game.grid = data.grid;
            }
            if (this.gameData.clientPlayer.name === data.player.name) {
                this.gameData.clientPlayer.movementPoints =
                    this.gameData.clientPlayer.movementPoints -
                    this.playerMovementService.calculateRemainingMovementPoints(this.getClientPlayerPosition(), data.player);
                this.gameData.movementPointsRemaining = this.gameData.clientPlayer.movementPoints;
                this.gameData.isCurrentlyMoving = data.isCurrentlyMoving;
                this.updateAvailablePath();
            }

            this.checkAvailableActions(this.gameData); // change function below
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('combatStarted', () => {
            this.gameData.isInCombatMode = true;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('gameTurnResumed', (data: { player: Player }) => {
            this.gameData.currentPlayer = data.player;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('attackResult', (data: { success: boolean; attackScore: number; defenseScore: number }) => {
            this.updateAttackResult(data);
            this.gameData.evadeResult = null;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('playerUpdate', (data: { player: Player }) => {
            if (this.gameData.clientPlayer.name === data.player.name) {
                this.gameData.clientPlayer = data.player;
            }
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('playerListUpdate', (data: { players: Player[] }) => {
            this.gameData.lobby.players = data.players;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('doorClicked', (data: { grid: Tile[][] }) => {
            if (!this.gameData.game || !this.gameData.game.grid) {
                return;
            }
            this.gameData.game.grid = data.grid;
            this.gameData.clientPlayer.actionPoints = noActionPoints;
            this.gameData.isActionMode = false;
            this.updateAvailablePath();
            this.checkAvailableActions(this.gameData); // change function below
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('combatTurnStarted', (data: { fighter: Player; duration: number; escapeAttemptsLeft: number }) => {
            this.gameData.currentPlayer = data.fighter;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('combatTimerUpdate', (data: { timeLeft: number }) => {
            this.gameData.turnTimer = data.timeLeft;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('gridUpdate', (data: { grid: Tile[][] }) => {
            if (!this.gameData.game || !this.gameData.game.grid) {
                return;
            }
            this.gameData.game.grid = data.grid;
            this.updateAvailablePath();
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('escapeAttempt', (data: { attemptsLeft: number; isEscapeSuccessful: boolean }) => {
            this.gameData.evadeResult = data;
            this.gameData.attackResult = null;
            this.gameData.escapeAttempts = data.attemptsLeft;
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('combatEnded', (data: { winner: Player; hasEvaded: boolean }) => {
            this.gameData.isInCombatMode = false;
            this.gameData.escapeAttempts = defaultEscapeAttempts;
            this.gameData.isActionMode = false;
            this.gameData.clientPlayer.actionPoints = noActionPoints;
            this.gameData.evadeResult = null;
            this.gameData.attackResult = null;
            this.gameData.escapeAttempts = defaultEscapeAttempts;
            if (data && data.winner && !data.hasEvaded) {
                this.snackbarService.showMultipleMessages(`${data.winner.name} a gagné le combat !`, undefined, delayMessageAfterCombatEnded);
            } else {
                this.snackbarService.showMultipleMessages(`${data.winner.name} a evadé le combat !`, undefined, delayMessageAfterCombatEnded);
            }
            if (this.gameData.clientPlayer.name === this.gameData.currentPlayer.name) {
                this.gameData.clientPlayer.movementPoints = this.gameData.movementPointsRemaining;
            }

            this.checkAvailableActions(this.gameData);
            this.gameDataSubject.next(this.gameData);
        });

        this.socketClientService.on('adminModeChangedServerSide', () => {
            this.gameData.isDebugMode = !this.gameData.isDebugMode;
            this.snackbarService.showMessage(`Mode debug ${this.gameData.isDebugMode ? 'activé' : 'désactivé'}`);
            this.gameDataSubject.next(this.gameData);
        });
    }

    unsubscribeSocketListeners(): void {
        events.forEach((event) => {
            this.socketClientService.socket.off(event);
        });
    }

    endTurn(): void {
        this.gameData.hasTurnEnded = true;
        this.gameData.turnTimer = 0;
        this.socketClientService.emit('endTurn', { accessCode: this.gameData.lobby.accessCode });
    }

    abandonGame(): void {
        this.gameData.clientPlayer.hasAbandoned = true;
        this.socketClientService.emit('abandonedGame', { player: this.gameData.clientPlayer, accessCode: this.gameData.lobby.accessCode });
        this.backToHome();
    }
    getClientPlayerPosition(): Tile | undefined {
        if (!this.gameData.game || !this.gameData.game.grid || !this.gameData.clientPlayer) {
            return undefined;
        }
        for (const row of this.gameData.game.grid) {
            for (const tile of row) {
                if (tile.player && tile.player.name === this.gameData.clientPlayer.name) {
                    return tile;
                }
            }
        }
        return undefined;
    }

    private updateAttackResult(data: { success: boolean; attackScore: number; defenseScore: number } | null): void {
        this.gameData.attackResult = data;
    }

    private backToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    private handlePageRefresh(): void {
        if (sessionStorage.getItem('refreshed') === 'true') {
            this.abandonGame();
        } else {
            sessionStorage.setItem('refreshed', 'true');
        }
    }

    private updateAvailablePath(): void {
        if (this.gameData.currentPlayer.name === this.gameData.clientPlayer.name && this.gameData.game && this.gameData.game.grid) {
            this.gameData.availablePath = this.playerMovementService.availablePath(
                this.getClientPlayerPosition(),
                this.gameData.clientPlayer.movementPoints,
                this.gameData.game.grid,
            );
        } else {
            this.gameData.availablePath = [];
        }
    }

    private checkAvailableActions(gameData: GameData): void {
        const clientPlayerPosition = this.getClientPlayerPosition();
        if (!clientPlayerPosition || !gameData.game || !gameData.game.grid) return;
        const hasIce = this.playerMovementService.hasAdjacentIce(clientPlayerPosition, gameData.game.grid);
        const hasActionAvailable = this.playerMovementService.hasAdjacentPlayerOrDoor(clientPlayerPosition, gameData.game.grid);
        if (gameData.clientPlayer.actionPoints === 0 && gameData.clientPlayer.movementPoints === 0) {
            if (!hasIce) {
                this.endTurn();
            }
        } else if (gameData.clientPlayer.actionPoints === 1 && gameData.clientPlayer.movementPoints === 0) {
            if (!hasIce && !hasActionAvailable) {
                this.endTurn();
            }
        }
    }
}
