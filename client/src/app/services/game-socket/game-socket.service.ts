import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
import { DELAY_BEFORE_ENDING_GAME, DELAY_BEFORE_HOME, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Injectable({
    providedIn: 'root',
})
export class GameSocketService {
    // private gameData = new GameData();
    // private gameDataSubject = new BehaviorSubject<GameData>(this.gameData);
    //  REFACTOR : SPLIT INTO MULTIPLE SERVICES EACH FOR A SPECIFIC GROUP OF EVENTS (COMBAT, TURN, ETC) SINGLE RESPONSABILITY PRINCIPLE!!!!
    constructor(
        private gameStateService: GameStateSocketService,
        private gameplayService: GameplayService,
        private snackbarService: SnackbarService,
        private socketClientService: SocketClientService,
        private playerMovementService: PlayerMovementService,
    ) {}

    // get gameData$(): Observable<GameData> {
    //     return this.gameDataSubject.asObservable();
    // }

    initializeSocketListeners(): void {
        this.handlePageRefresh();
        this.onGameAbandoned();
        this.onGameDeleted();
        this.onGameEnded();
        this.onAdminModeDisabled();
        this.onGameStarted();
        this.onPlayerMovement();
        this.onPlayerUpdate();
        this.onPlayerListUpdate();
        this.onDoorClicked();
        this.onGridUpdate();
        this.onAdminModeChangedServerSide();
        this.onItemChoice();
        this.onItemDropped();
        this.onPlayerClientUpdate();
    }

    // unsubscribeSocketListeners(): void {
    //     EVENTS.forEach((event) => {
    //         this.socketClientService.socket.off(event);
    //     });
    // }

    private handlePageRefresh(): void {
        if (sessionStorage.getItem('refreshed') === 'true') {
            this.gameplayService.abandonGame(this.gameStateService.gameDataSubjectValue);
        } else {
            sessionStorage.setItem('refreshed', 'true');
        }
    }

    // private fetchGameData(): void {
    //     const lobby = sessionStorage.getItem('lobby');
    //     this.gameData.lobby = lobby ? (JSON.parse(lobby) as Lobby) : this.gameData.lobby;
    //     const clientPlayer = sessionStorage.getItem('player');
    //     this.gameData.clientPlayer = clientPlayer ? (JSON.parse(clientPlayer) as Player) : this.gameData.clientPlayer;
    //     this.gameData.lobby.players = JSON.parse(sessionStorage.getItem('orderedPlayers') || '[]');
    //     const game = sessionStorage.getItem('game');
    //     this.gameData.game = game ? (JSON.parse(game) as Game) : this.gameData.game;

    //     this.gameDataSubject.next(this.gameData);
    // }

    private onGameAbandoned(): void {
        this.socketClientService.on('game-abandoned', (data: { player: Player }) => {
            const abandonedPlayer = this.gameStateService.gameDataSubjectValue.lobby.players.find((p) => p.name === data.player.name);
            if (!abandonedPlayer) return;
            abandonedPlayer.hasAbandoned = true;
            this.gameStateService.gameDataSubjectValue.lobby.players = this.gameStateService.gameDataSubjectValue.lobby.players.filter(
                (p) => p.name !== data.player.name,
            );
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private onItemChoice(): void {
        this.socketClientService.on('itemChoice', (data: { items: [Item, Item, Item] }) => {
            this.gameplayService.createItemPopUp(data.items);
        });
    }

    private onItemDropped(): void {
        this.socketClientService.on('itemDropped', (data: { accessCode: string; player: Player; item: Item }) => {
            this.socketClientService.emit('itemDrop', data);
        });
    }

    private onPlayerClientUpdate(): void {
        this.socketClientService.on('playerClientUpdate', (data: { player: Player }) => {
            console.log(`This is a client player update ${data.player.name}`);
            console.log(this.gameStateService.gameDataSubjectValue.clientPlayer.name);
            console.log(this.gameStateService.gameDataSubjectValue.currentPlayer.name);

            // probleme ici
            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === data.player.name) {
                this.gameStateService.gameDataSubjectValue.clientPlayer = data.player;
            }
        });
    }

    private onGameDeleted(): void {
        this.socketClientService.on('gameDeleted', () => {
            this.snackbarService.showMessage("Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil");
            setTimeout(() => {
                this.gameplayService.backToHome();
            }, DELAY_BEFORE_HOME);
        });
    }

    private onGameEnded(): void {
        this.socketClientService.on('gameEnded', (data: { winner: string }) => {
            this.snackbarService.showMessage(`👑 ${data.winner} a remporté la partie ! Redirection vers l'accueil sous peu`);
            setTimeout(() => {
                this.gameplayService.abandonGame(this.gameStateService.gameDataSubjectValue);
            }, DELAY_BEFORE_ENDING_GAME);
        });
    }

    private onAdminModeDisabled(): void {
        this.socketClientService.on('adminModeDisabled', () => {
            if (this.gameStateService.gameDataSubjectValue.isDebugMode) {
                this.snackbarService.showMessage("Mode debug 'désactivé'");
            }
            this.gameStateService.gameDataSubjectValue.isDebugMode = false;
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    // private onTransitionStarted(): void {
    //     this.socketClientService.on('transitionStarted', (data: { nextPlayer: Player; transitionDuration: number }) => {
    //         this.snackbarService.showMultipleMessages(`Le tour à ${data.nextPlayer.name} commence dans ${data.transitionDuration} secondes`);
    //         if (data.nextPlayer.name === this.gameData.clientPlayer.name) {
    //             this.gameData.clientPlayer = data.nextPlayer;
    //         }
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    // private onTurnStarted(): void {
    //     this.socketClientService.on('turnStarted', (data: { player: Player; turnDuration: number }) => {
    //         this.snackbarService.showMessage(`C'est à ${data.player.name} de jouer`);
    //         this.gameData.currentPlayer = data.player;
    //         this.gameData.isCurrentlyMoving = false;
    //         this.gameData.isActionMode = false;
    //         this.gameData.isInCombatMode = false;
    //         this.gameData.clientPlayer.actionPoints = DEFAULT_ACTION_POINTS;
    //         this.gameData.clientPlayer.movementPoints = this.gameData.clientPlayer.speed;
    //         this.gameData.turnTimer = data.turnDuration;
    //         this.gameData.hasTurnEnded = this.gameData.clientPlayer.name !== this.gameData.currentPlayer.name;
    //         this.gameplayService.updateAvailablePath(this.gameData);
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    // private onTimerUpdate(): void {
    //     this.socketClientService.on('timerUpdate', (data: { timeLeft: number }) => {
    //         this.gameData.turnTimer = data.timeLeft;
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    private onGameStarted(): void {
        this.socketClientService.socket.on('gameStarted', (data: { orderedPlayers: Player[]; updatedGame: Game }) => {
            this.gameStateService.gameDataSubjectValue.lobby.players = data.orderedPlayers;
            this.gameStateService.gameDataSubjectValue.game = data.updatedGame;
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private onPlayerMovement(): void {
        this.socketClientService.on('playerMovement', (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => {
            if (this.gameStateService.gameDataSubjectValue.game && this.gameStateService.gameDataSubjectValue.game.grid) {
                this.gameStateService.gameDataSubjectValue.game.grid = data.grid;
            }
            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === data.player.name) {
                this.gameStateService.gameDataSubjectValue.clientPlayer.movementPoints =
                    this.gameStateService.gameDataSubjectValue.clientPlayer.movementPoints -
                    this.playerMovementService.calculateRemainingMovementPoints(
                        this.gameplayService.getClientPlayerPosition(this.gameStateService.gameDataSubjectValue),
                        data.player,
                    );
                this.gameStateService.gameDataSubjectValue.clientPlayer.inventory = data.player.inventory;
                this.gameStateService.gameDataSubjectValue.movementPointsRemaining =
                    this.gameStateService.gameDataSubjectValue.clientPlayer.movementPoints;
                this.gameStateService.gameDataSubjectValue.isCurrentlyMoving = data.isCurrentlyMoving;
                this.gameplayService.updateAvailablePath(this.gameStateService.gameDataSubjectValue);
            }

            this.gameplayService.checkAvailableActions(this.gameStateService.gameDataSubjectValue);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    // private onCombatStarted(): void {
    //     this.socketClientService.on('combatStarted', () => {
    //         this.gameData.isInCombatMode = true;
    //         this.gameDataSubject.next(this.gameData);
    //         // this.dialog.open(GameCombatComponent, {
    //         //     width: '800px', // Set the width
    //         //     height: '500px', // Set the height
    //         //     disableClose: true,
    //         // });
    //     });
    // }

    // private onGameTurnResumed(): void {
    //     this.socketClientService.on('gameTurnResumed', (data: { player: Player }) => {
    //         this.gameData.currentPlayer = data.player;
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    // private onAttackResult(): void {
    //     this.socketClientService.on('attackResult', (data: { success: boolean; attackScore: number; defenseScore: number }) => {
    //         this.gameplayService.updateAttackResult(this.gameData, data);
    //         this.gameData.evadeResult = null;
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    private onPlayerUpdate(): void {
        this.socketClientService.on('playerUpdate', (data: { player: Player }) => {
            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === data.player.name) {
                this.gameStateService.gameDataSubjectValue.clientPlayer = data.player;
            }
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private onPlayerListUpdate(): void {
        this.socketClientService.on('playerListUpdate', (data: { players: Player[] }) => {
            this.gameStateService.gameDataSubjectValue.lobby.players = data.players;
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private onDoorClicked(): void {
        this.socketClientService.on('doorClicked', (data: { grid: Tile[][] }) => {
            if (!this.gameStateService.gameDataSubjectValue.game || !this.gameStateService.gameDataSubjectValue.game.grid) {
                return;
            }
            this.gameStateService.gameDataSubjectValue.game.grid = data.grid;
            this.gameStateService.gameDataSubjectValue.clientPlayer.actionPoints = NO_ACTION_POINTS;
            this.gameStateService.gameDataSubjectValue.isActionMode = false;
            this.gameplayService.updateAvailablePath(this.gameStateService.gameDataSubjectValue);
            this.gameplayService.checkAvailableActions(this.gameStateService.gameDataSubjectValue);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    // private onCombatTurnStarted(): void {
    //     this.socketClientService.on('combatTurnStarted', (data: { fighter: Player; duration: number; escapeAttemptsLeft: number }) => {
    //         this.gameData.currentPlayer = data.fighter;
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    // private onCombatTimerUpdate(): void {
    //     this.socketClientService.on('combatTimerUpdate', (data: { timeLeft: number }) => {
    //         this.gameData.turnTimer = data.timeLeft;
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    private onGridUpdate(): void {
        this.socketClientService.on('gridUpdate', (data: { grid: Tile[][] }) => {
            if (!this.gameStateService.gameDataSubjectValue.game || !this.gameStateService.gameDataSubjectValue.game.grid) {
                return;
            }
            this.gameStateService.gameDataSubjectValue.game.grid = data.grid;
            this.gameplayService.updateAvailablePath(this.gameStateService.gameDataSubjectValue);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    // private onEscapeAttempt(): void {
    //     this.socketClientService.on('escapeAttempt', (data: { attemptsLeft: number; isEscapeSuccessful: boolean }) => {
    //         this.gameData.evadeResult = data;
    //         this.gameData.attackResult = null;
    //         this.gameData.escapeAttempts = data.attemptsLeft;
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    // private onCombatEnded(): void {
    //     this.socketClientService.on('combatEnded', (data: { winner: Player; hasEvaded: boolean }) => {
    //         this.gameData.isInCombatMode = false;
    //         this.gameData.escapeAttempts = DEFAULT_ESCAPE_ATTEMPTS;
    //         this.gameData.isActionMode = false;
    //         this.gameData.clientPlayer.actionPoints = NO_ACTION_POINTS;
    //         this.gameData.evadeResult = null;
    //         this.gameData.attackResult = null;
    //         this.gameData.escapeAttempts = DEFAULT_ESCAPE_ATTEMPTS;
    //         if (data && data.winner && !data.hasEvaded) {
    //             this.snackbarService.showMultipleMessages(`${data.winner.name} a gagné le combat !`, undefined, DELAY_MESSAGE_AFTER_COMBAT_ENDED);
    //         } else {
    //             this.snackbarService.showMultipleMessages(`${data.winner.name} a evadé le combat !`, undefined, DELAY_MESSAGE_AFTER_COMBAT_ENDED);
    //         }
    //         if (this.gameData.clientPlayer.name === this.gameData.currentPlayer.name) {
    //             this.gameData.clientPlayer.movementPoints = this.gameData.movementPointsRemaining;
    //         }

    //         this.gameplayService.checkAvailableActions(this.gameData);
    //         this.gameDataSubject.next(this.gameData);
    //     });
    // }

    private onAdminModeChangedServerSide(): void {
        this.socketClientService.on('adminModeChangedServerSide', () => {
            this.gameStateService.gameDataSubjectValue.isDebugMode = !this.gameStateService.gameDataSubjectValue.isDebugMode;
            this.snackbarService.showMessage(`Mode debug ${this.gameStateService.gameDataSubjectValue.isDebugMode ? 'activé' : 'désactivé'}`);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }
}
