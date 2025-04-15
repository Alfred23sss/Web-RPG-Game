import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item/item';
import { DELAY_BEFORE_ENDING_GAME, DELAY_BEFORE_HOME, NO_ACTION_POINTS, REFRESH_STORAGE } from '@app/constants/global.constants';
import { ClientNotifierMessage, LogBookEntry, SocketEvent } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { GameStatistics } from '@app/interfaces/statistics';
import { Tile } from '@app/interfaces/tile';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { ItemName } from '@common/enums';

@Injectable({
    providedIn: 'root',
})
export class GameSocketService {
    private doorClickedTimer: number | null = null;
    private readonly DoorClickedDelay = 50;
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
        if (sessionStorage.getItem(REFRESH_STORAGE) === 'true') {
            this.gameplayService.abandonGame(this.gameStateService.gameDataSubjectValue);
        } else {
            sessionStorage.setItem(REFRESH_STORAGE, 'true');
        }
    }

    private onGameAbandoned(): void {
        this.socketClientService.on(SocketEvent.GameAbandoned, (data: { player: Player }) => {
            const abandonedPlayer = this.gameStateService.gameDataSubjectValue.lobby.players.find((p) => p.name === data.player.name);
            if (!abandonedPlayer) return;
            abandonedPlayer.hasAbandoned = true;
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
            this.clientNotifier.addLogbookEntry(LogBookEntry.PlayerAbandoned, [data.player]);
        });
    }

    private onItemChoice(): void {
        this.socketClientService.on(SocketEvent.ItemChoice, (data: { items: [Item, Item, Item] }) => {
            this.gameplayService.createItemPopUp(data.items, this.gameStateService.gameDataSubjectValue);
        });
    }

    private onItemDropped(): void {
        this.socketClientService.on(SocketEvent.ItemDropped, (data: { accessCode: string; player: Player; item: Item }) => {
            this.clientNotifier.addLogbookEntry(`${data.player.name} ${LogBookEntry.ItemDropped}`, [data.player]);
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
                        this.clientNotifier.addLogbookEntry(`${data.player.name} ${LogBookEntry.FlagPickedUp}`, [data.player]);
                    } else {
                        this.clientNotifier.addLogbookEntry(`${data.player.name} ${LogBookEntry.ItemPickedUp}`, [data.player]);
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
            this.clientNotifier.displayMessage(ClientNotifierMessage.RedirectHome);
            setTimeout(() => {
                this.gameplayService.backToHome();
            }, DELAY_BEFORE_HOME);
        });
    }

    private onGameEnded(): void {
        this.socketClientService.on(SocketEvent.GameEnded, (data: { winner: string[]; stats: GameStatistics }) => {
            const players = this.gameStateService.gameDataSubjectValue.lobby.players.filter((player) => player.hasAbandoned === false);
            if (data.winner.length <= 1) {
                this.clientNotifier.displayMessage(`👑 ${data.winner} ${ClientNotifierMessage.SoloWin}`);
            } else {
                const winnerNames = data.winner.join(', ');
                this.clientNotifier.displayMessage(`👑 ${winnerNames} ${ClientNotifierMessage.TeamWin}`);
            }
            this.clientNotifier.addLogbookEntry(LogBookEntry.GameEnded, players);
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
                this.clientNotifier.displayMessage(ClientNotifierMessage.DeactivatedDebug);
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

    private onPlayerMovement(): void {
        this.socketClientService.on(SocketEvent.PlayerMovement, (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => {
            this.updateGameGridAndCheckInventory(data);

            if (this.gameStateService.gameDataSubjectValue.clientPlayer.name === data.player.name) {
                this.updateClientPlayerStats(data);
            }

            this.finalizeMovementUpdate();
        });
    }

    private updateGameGridAndCheckInventory(data: { grid: Tile[][]; player: Player }): void {
        if (this.gameStateService.gameDataSubjectValue.game && this.gameStateService.gameDataSubjectValue.game.grid) {
            this.gameStateService.gameDataSubjectValue.game.grid = data.grid;
        }

        const playerBeforeUpdate = this.gameStateService.gameDataSubjectValue.lobby.players.find((p) => p.name === data.player.name);
        if (playerBeforeUpdate) {
            const oldInventoryNames = (playerBeforeUpdate.inventory ?? []).map((item) => item?.name);
            const newInventoryNames = (data.player.inventory ?? []).map((item) => item?.name);
            const addedItems = newInventoryNames.filter((name) => !oldInventoryNames.includes(name));

            if (addedItems.length > 0) {
                if (addedItems.includes(ItemName.Flag)) {
                    this.clientNotifier.addLogbookEntry(`${data.player.name} ${LogBookEntry.FlagPickedUp}`, [data.player]);
                } else {
                    this.clientNotifier.addLogbookEntry(`${data.player.name} ${LogBookEntry.ItemPickedUp}`, [data.player]);
                }
            }
        }
    }

    private updateClientPlayerStats(data: { player: Player; isCurrentlyMoving: boolean }): void {
        const clientPlayer = this.gameStateService.gameDataSubjectValue.clientPlayer;
        const gameData = this.gameStateService.gameDataSubjectValue;

        clientPlayer.movementPoints =
            clientPlayer.movementPoints -
            this.playerMovementService.calculateRemainingMovementPoints(this.gameplayService.getClientPlayerPosition(gameData), data.player);

        clientPlayer.inventory = data.player.inventory;
        clientPlayer.hp = data.player.hp;
        clientPlayer.attack.value = data.player.attack.value;
        clientPlayer.defense.value = data.player.defense.value;
        clientPlayer.speed = data.player.speed;

        gameData.movementPointsRemaining = clientPlayer.movementPoints;
        gameData.isCurrentlyMoving = data.isCurrentlyMoving;

        this.gameplayService.updateAvailablePath(gameData);
    }

    private finalizeMovementUpdate(): void {
        this.gameplayService.checkAvailableActions(this.gameStateService.gameDataSubjectValue);
        this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
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
        this.socketClientService.on<{ grid: Tile[][]; isOpen: boolean; player: VirtualPlayer }>(SocketEvent.DoorClicked, (data) => {
            if (this.doorClickedTimer !== null) {
                return;
            }
            this.doorClickedTimer = window.setTimeout(() => {
                this.processDoorClicked(data);
                this.doorClickedTimer = null;
            }, this.DoorClickedDelay);
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
            this.clientNotifier.addLogbookEntry(LogBookEntry.WallAction, [this.gameStateService.gameDataSubjectValue.clientPlayer]);
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
            this.clientNotifier.displayMessage(
                `${LogBookEntry.DebugMode} ${
                    this.gameStateService.gameDataSubjectValue.isDebugMode ? LogBookEntry.Activated : LogBookEntry.Deactivated
                }`,
            );
            this.clientNotifier.addLogbookEntry(
                `${LogBookEntry.DebugMode} ${
                    this.gameStateService.gameDataSubjectValue.isDebugMode ? LogBookEntry.Activated : LogBookEntry.Deactivated
                }`,
                [playerAdmin],
            );
            this.gameStateService.updateGameData(this.gameStateService.gameDataSubjectValue);
        });
    }

    private processDoorClicked(data: { grid: Tile[][]; isOpen: boolean; player: VirtualPlayer }): void {
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
        this.clientNotifier.addLogbookEntry(`Un joueur a ${action}`, [data.player]);
    }
}
