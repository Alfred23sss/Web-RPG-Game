import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item/item';
import { DELAY_BEFORE_ENDING_GAME, DELAY_BEFORE_HOME, NO_ACTION_POINTS } from '@app/constants/global.constants';
import { SocketEvent } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { GameStatistics } from '@app/interfaces/statistics';
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
        this.onWallClicked();
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
        this.socketClientService.on(SocketEvent.GameAbandoned, (data: { player: Player }) => {
            const abandonedPlayer = this.gameStateService.gameDataSubjectValue.lobby.players.find((p) => p.name === data.player.name);
            if (!abandonedPlayer) return;
            abandonedPlayer.hasAbandoned = true;
            // this.gameStateService.gameDataSubjectValue.lobby.players = this.gameStateService.gameDataSubjectValue.lobby.players.filter(
            //     (p) => p.name !== data.player.name,
            // );
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
            this.clientNotifier.addLogbookEntry('Un joueur a abandonne la partie', [data.player]);
        });
    }

    private onItemChoice(): void {
        this.socketClientService.on(SocketEvent.ItemChoice, (data: { items: [Item, Item, Item] }) => {
            this.gameplayService.createItemPopUp(data.items, this.gameStateService.gameDataSubjectValue);
        });
    }

    // no need to be client side dont even know if its used
    private onItemDropped(): void {
        this.socketClientService.on(SocketEvent.ItemDropped, (data: { accessCode: string; player: Player; item: Item }) => {
            this.clientNotifier.addLogbookEntry(`${data.player.name} a déposé un item!`, [data.player]);
            this.socketClientService.emit(SocketEvent.ItemDrop, data);
        });
    }

    private onPlayerClientUpdate(): void {
        this.socketClientService.on(SocketEvent.PlayerClientUpdate, (data: { player: Player }) => {
            const gameData = this.gameStateService.gameDataSubjectValue;
            const playerBeforeUpdate = gameData.lobby.players.find((p) => p.name === data.player.name);
            if (playerBeforeUpdate) {
                const oldInventoryNames = (playerBeforeUpdate.inventory ?? []).map((item) => item?.name);
                const newInventoryNames = (data.player.inventory ?? []).map((item) => item?.name);
                const addedItems = newInventoryNames.filter((name) => !oldInventoryNames.includes(name));
                if (addedItems.length > 0) {
                    if (addedItems.includes('flag')) {
                        this.clientNotifier.addLogbookEntry(`${data.player.name} a pris le drapeau!`, [data.player]);
                    } else {
                        this.clientNotifier.addLogbookEntry(`${data.player.name} a pris un item!`, [data.player]);
                    }
                }
                playerBeforeUpdate.inventory = data.player.inventory;
            }
            if (gameData.clientPlayer.name === data.player.name) {
                gameData.clientPlayer = data.player;
            }
        });
    }

    private onGameDeleted(): void {
        this.socketClientService.on(SocketEvent.GameDeleted, () => {
            this.gameStateService.gameDataSubjectValue.turnTimer = 0;
            this.clientNotifier.displayMessage("Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil");
            setTimeout(() => {
                this.gameplayService.backToHome();
            }, DELAY_BEFORE_HOME);
        });
    }

    private onGameEnded(): void {
        this.socketClientService.on(SocketEvent.GameEnded, (data: { winner: string[]; stats: GameStatistics }) => {
            const players = this.gameStateService.gameDataSubjectValue.lobby.players.filter((player) => player.hasAbandoned === false);
            if (data.winner.length <= 1) {
                this.clientNotifier.displayMessage(`👑 ${data.winner} a remporté la partie ! Redirection vers la page de fin sous peu`);
            } else {
                const winnerNames = data.winner.join(', ');
                this.clientNotifier.displayMessage(`👑 ${winnerNames} ont remporté la partie ! Redirection vers la page de fin sous peu`);
            }
            this.clientNotifier.addLogbookEntry('Fin de la partie', players);
            this.gameStateService.gameDataSubjectValue.gameStats = data.stats;
            this.gameStateService.gameDataSubjectValue.turnTimer = 0;
            setTimeout(() => {
                this.gameplayService.navigateToFinalPage();
            }, DELAY_BEFORE_ENDING_GAME);
        });
    }

    private onAdminModeDisabled(): void {
        this.socketClientService.on(SocketEvent.AdminModeDisabled, () => {
            if (this.gameStateService.gameDataSubjectValue.isDebugMode) {
                this.clientNotifier.displayMessage("Mode debug 'désactivé'");
            }
            this.gameStateService.gameDataSubjectValue.isDebugMode = false;
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private onGameStarted(): void {
        this.socketClientService.socket.on(SocketEvent.GameStarted, (data: { orderedPlayers: Player[]; updatedGame: Game }) => {
            this.gameStateService.gameDataSubjectValue.lobby.players = data.orderedPlayers;
            this.gameStateService.gameDataSubjectValue.clientPlayer =
                data.orderedPlayers.find((p) => p.name === this.gameStateService.gameDataSubjectValue.clientPlayer.name) ||
                this.gameStateService.gameDataSubjectValue.clientPlayer;
            this.gameStateService.gameDataSubjectValue.game = data.updatedGame;
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    // refactor for god sake
    private onPlayerMovement(): void {
        this.socketClientService.on(SocketEvent.PlayerMovement, (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => {
            if (this.gameStateService.gameDataSubjectValue.game && this.gameStateService.gameDataSubjectValue.game.grid) {
                this.gameStateService.gameDataSubjectValue.game.grid = data.grid;
            }

            const playerBeforeUpdate = this.gameStateService.gameDataSubjectValue.lobby.players.find((p) => p.name === data.player.name);
            if (playerBeforeUpdate) {
                const oldInventoryNames = (playerBeforeUpdate.inventory ?? []).map((item) => item?.name);
                const newInventoryNames = (data.player.inventory ?? []).map((item) => item?.name);
                const addedItems = newInventoryNames.filter((name) => !oldInventoryNames.includes(name));
                if (addedItems.length > 0) {
                    if (addedItems.includes('flag')) {
                        this.clientNotifier.addLogbookEntry(`${data.player.name} a pris le drapeau!`, [data.player]);
                    } else {
                        this.clientNotifier.addLogbookEntry(`${data.player.name} a pris un item!`, [data.player]);
                    }
                }
            }

            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === data.player.name) {
                this.gameStateService.gameDataSubjectValue.clientPlayer.movementPoints =
                    this.gameStateService.gameDataSubjectValue.clientPlayer.movementPoints -
                    this.playerMovementService.calculateRemainingMovementPoints(
                        this.gameplayService.getClientPlayerPosition(this.gameStateService.gameDataSubjectValue),
                        data.player,
                    );
                const player = this.gameStateService.gameDataSubjectValue.clientPlayer;
                // repetition
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
        this.socketClientService.on(SocketEvent.PlayerUpdate, (data: { player: Player }) => {
            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === data.player.name) {
                this.gameStateService.gameDataSubjectValue.clientPlayer = data.player;
            }
            const affectedPlayerIndex = this.gameStateService.gameDataSubjectValue.playersInFight.findIndex((p) => p.name === data.player.name);
            if (affectedPlayerIndex !== -1) {
                this.gameStateService.gameDataSubjectValue.playersInFight[affectedPlayerIndex] = data.player;
            }
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private onPlayerListUpdate(): void {
        this.socketClientService.on(SocketEvent.PlayerListUpdate, (data: { players: Player[] }) => {
            this.gameStateService.gameDataSubjectValue.lobby.players = data.players;
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private onDoorClicked(): void {
        this.socketClientService.on(SocketEvent.DoorClicked, (data: { grid: Tile[][]; isOpen: boolean }) => {
            if (!this.gameStateService.gameDataSubjectValue.game || !this.gameStateService.gameDataSubjectValue.game.grid) {
                return;
            }
            this.gameStateService.gameDataSubjectValue.game.grid = data.grid;
            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === this.gameStateService.gameDataSubjectValue.currentPlayer.name) {
                this.gameStateService.gameDataSubjectValue.clientPlayer.actionPoints = NO_ACTION_POINTS;
            }
            this.gameStateService.gameDataSubjectValue.isActionMode = false;
            this.gameplayService.updateAvailablePath(this.gameStateService.gameDataSubjectValue);
            this.gameplayService.checkAvailableActions(this.gameStateService.gameDataSubjectValue);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
            const action = data.isOpen ? 'fermé une porte' : 'ouvert une porte';
            this.clientNotifier.addLogbookEntry(`Un joueur a ${action}`, [this.gameStateService.gameDataSubjectValue.clientPlayer]);
        });
    }

    private onWallClicked(): void {
        this.socketClientService.on(SocketEvent.WallClicked, (data: { grid: Tile[][] }) => {
            if (!this.gameStateService.gameDataSubjectValue.game || !this.gameStateService.gameDataSubjectValue.game.grid) {
                return;
            }
            this.gameStateService.gameDataSubjectValue.game.grid = data.grid;
            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === this.gameStateService.gameDataSubjectValue.currentPlayer.name) {
                this.gameStateService.gameDataSubjectValue.clientPlayer.actionPoints = NO_ACTION_POINTS;
            }
            this.gameStateService.gameDataSubjectValue.isActionMode = false;
            this.gameplayService.updateAvailablePath(this.gameStateService.gameDataSubjectValue);
            this.gameplayService.checkAvailableActions(this.gameStateService.gameDataSubjectValue);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
            this.clientNotifier.addLogbookEntry('Un joueur a effectue une action sur un mur!', [
                this.gameStateService.gameDataSubjectValue.clientPlayer,
            ]);
        });
    }

    private onGridUpdate(): void {
        this.socketClientService.on(SocketEvent.GridUpdate, (data: { grid: Tile[][] }) => {
            if (!this.gameStateService.gameDataSubjectValue.game || !this.gameStateService.gameDataSubjectValue.game.grid) {
                return;
            }
            this.gameStateService.gameDataSubjectValue.game.grid = data.grid;
            this.gameplayService.updateAvailablePath(this.gameStateService.gameDataSubjectValue);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private onAdminModeChangedServerSide(): void {
        this.socketClientService.on(SocketEvent.AdminModeChangedServerSide, () => {
            this.gameStateService.gameDataSubjectValue.isDebugMode = !this.gameStateService.gameDataSubjectValue.isDebugMode;
            const playerAdmin = this.gameStateService.gameDataSubjectValue.lobby.players.find((p) => p.isAdmin === true);
            if (!playerAdmin) return;
            this.clientNotifier.displayMessage(`Mode debug ${this.gameStateService.gameDataSubjectValue.isDebugMode ? 'activé' : 'désactivé'}`);
            this.clientNotifier.addLogbookEntry(`Mode debug ${this.gameStateService.gameDataSubjectValue.isDebugMode ? 'activé' : 'désactivé'}`, [
                playerAdmin,
            ]);
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }
}
