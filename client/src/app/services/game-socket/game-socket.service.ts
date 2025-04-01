import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
import { DELAY_BEFORE_ENDING_GAME, DELAY_BEFORE_HOME, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Injectable({
    providedIn: 'root',
})
export class GameSocketService {
    constructor(
        private gameStateService: GameStateSocketService,
        private gameplayService: GameplayService,
        private socketClientService: SocketClientService,
        private playerMovementService: PlayerMovementService,
        private readonly clientNotifier: ClientNotifierServices,
    ) {}
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

    private handlePageRefresh(): void {
        if (sessionStorage.getItem('refreshed') === 'true') {
            this.gameplayService.abandonGame(this.gameStateService.gameDataSubjectValue);
        } else {
            sessionStorage.setItem('refreshed', 'true');
        }
    }

    private onGameAbandoned(): void {
        this.socketClientService.on('game-abandoned', (data: { player: Player }) => {
            const abandonedPlayer = this.gameStateService.gameDataSubjectValue.lobby.players.find((p) => p.name === data.player.name);
            if (!abandonedPlayer) return;
            abandonedPlayer.hasAbandoned = true;
            this.gameStateService.gameDataSubjectValue.lobby.players = this.gameStateService.gameDataSubjectValue.lobby.players.filter(
                (p) => p.name !== data.player.name,
            );
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
            this.clientNotifier.addLogbookEntry('Un joeur a abandonne la partie', [data.player]);
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
            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === data.player.name) {
                this.gameStateService.gameDataSubjectValue.clientPlayer = data.player;
            }
        });
    }

    private onGameDeleted(): void {
        this.socketClientService.on('gameDeleted', () => {
            this.clientNotifier.displayMessage("Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil");
            setTimeout(() => {
                this.gameplayService.backToHome();
            }, DELAY_BEFORE_HOME);
        });
    }

    private onGameEnded(): void {
        this.socketClientService.on('gameEnded', (data: { winner: string }) => {
            const players = this.gameStateService.gameDataSubjectValue.lobby.players;
            players.filter((p) => p.hasAbandoned === false); // pt pas update a voir
            this.clientNotifier.displayMessage(`👑 ${data.winner} a remporté la partie ! Redirection vers l'accueil sous peu`);
            this.clientNotifier.addLogbookEntry('Fin de la partie', players);
            setTimeout(() => {
                this.gameplayService.abandonGame(this.gameStateService.gameDataSubjectValue);
            }, DELAY_BEFORE_ENDING_GAME);
        });
    }

    private onAdminModeDisabled(): void {
        this.socketClientService.on('adminModeDisabled', () => {
            if (this.gameStateService.gameDataSubjectValue.isDebugMode) {
                this.clientNotifier.displayMessage("Mode debug 'désactivé'");
            }
            this.gameStateService.gameDataSubjectValue.isDebugMode = false;
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

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
                const player = this.gameStateService.gameDataSubjectValue.clientPlayer;
                player.inventory = data.player.inventory;
                player.hp = data.player.hp;
                player.attack.value = data.player.attack.value;
                player.defense.value = data.player.defense.value;
                player.speed = data.player.speed;

                this.gameStateService.gameDataSubjectValue.movementPointsRemaining =
                    this.gameStateService.gameDataSubjectValue.clientPlayer.movementPoints;

                this.gameStateService.gameDataSubjectValue.isCurrentlyMoving = data.isCurrentlyMoving;
                this.gameplayService.updateAvailablePath(this.gameStateService.gameDataSubjectValue);
            }

            this.gameplayService.checkAvailableActions(this.gameStateService.gameDataSubjectValue);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

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
            this.clientNotifier.addLogbookEntry('Un joeur a effectue une action sur une porte!', [
                this.gameStateService.gameDataSubjectValue.clientPlayer,
            ]);
        });
    }

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

    private onAdminModeChangedServerSide(): void {
        this.socketClientService.on('adminModeChangedServerSide', () => {
            this.gameStateService.gameDataSubjectValue.isDebugMode = !this.gameStateService.gameDataSubjectValue.isDebugMode;
            const playerAdmin = this.gameStateService.gameDataSubjectValue.lobby.players.find((p) => p.isAdmin === true);
            if (!playerAdmin) return;
            this.clientNotifier.displayMessage(`Mode debug ${this.gameStateService.gameDataSubjectValue.isDebugMode ? 'activé' : 'désactivé'}`); // test those lines
            this.clientNotifier.addLogbookEntry(`Mode debug ${this.gameStateService.gameDataSubjectValue.isDebugMode ? 'activé' : 'désactivé'}`, [
                playerAdmin,
            ]);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }
}
