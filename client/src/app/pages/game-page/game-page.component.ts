import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameData } from '@app/classes/game-data/game-data';
import { ChatComponent } from '@app/components/chat/chat.component';
import { GridComponent } from '@app/components/grid/grid.component';
import { LogBookComponent } from '@app/components/log-book/log-book.component';
import { PlayerInfoComponent } from '@app/components/player-info/player-info.component';
import { KEY_DOWN_EVENT_LISTENER, REFRESH_STORAGE } from '@app/constants/global.constants';
import { Keys, Tab } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SocketListenerService } from '@app/services/socket-listener/socket-listener.service';
import { ItemName, ItemType, TeamType } from '@common/enums';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-page',
    standalone: true,
    templateUrl: './game-page.component.html',
    styleUrls: ['./game-page.component.scss'],
    imports: [CommonModule, GridComponent, ChatComponent, LogBookComponent, PlayerInfoComponent],
})
export class GamePageComponent implements OnInit, OnDestroy {
    gameData: GameData = new GameData();
    teamType = TeamType;
    activeTab: Tab.Chat | Tab.Log = Tab.Chat;
    private keyPressHandler: (event: KeyboardEvent) => void;
    private gameDataSubscription: Subscription;

    constructor(
        private readonly gameplayService: GameplayService,
        private readonly gameStateSocketService: GameStateSocketService,
        private readonly socketListenerService: SocketListenerService,
    ) {}

    get activePlayerCount(): number {
        return this.gameData.lobby.players.filter((player) => player.hasAbandoned !== true).length;
    }

    ngOnInit(): void {
        this.gameDataSubscription = this.gameStateSocketService.gameData$.subscribe((data) => {
            this.gameData = data;
        });

        this.socketListenerService.initializeAllSocketListeners();
        this.keyPressHandler = this.handleKeyPress.bind(this);
        document.addEventListener(KEY_DOWN_EVENT_LISTENER, this.keyPressHandler);
    }

    handleDoorClick(targetTile: Tile): void {
        this.gameplayService.handleDoorClick(this.gameData, targetTile);
    }

    handleWallClick(targetTile: Tile): void {
        this.gameplayService.handleWallClick(this.gameData, targetTile, this.gameData.clientPlayer);
    }

    handleAttackClick(targetTile: Tile): void {
        this.gameplayService.handleAttackClick(this.gameData, targetTile);
    }

    handleTileClick(targetTile: Tile): void {
        this.gameplayService.handleTileClick(this.gameData, targetTile);
    }

    handleTeleport(targetTile: Tile): void {
        this.gameplayService.handleTeleport(this.gameData, targetTile);
    }

    updateQuickestPath(targetTile: Tile): void {
        this.gameplayService.updateQuickestPath(this.gameData, targetTile);
    }

    endTurn(): void {
        this.gameplayService.endTurn(this.gameData);
    }

    executeNextAction(): void {
        this.gameplayService.executeNextAction(this.gameData);
    }

    abandonGame(): void {
        this.gameplayService.abandonGame(this.gameData);
    }

    ngOnDestroy(): void {
        if (this.gameDataSubscription) {
            this.gameDataSubscription.unsubscribe();
        }
        document.removeEventListener(KEY_DOWN_EVENT_LISTENER, this.keyPressHandler);
        this.socketListenerService.unsubscribeSocketListeners();
        sessionStorage.setItem(REFRESH_STORAGE, 'false');
    }

    hasFlag(player: Player): boolean {
        return player.inventory.some((item) => item?.name.toLowerCase() === ItemName.Flag);
    }

    getFlagImage(player: Player): string {
        const flagItem = player.inventory.find((item) => item !== null && item.name === ItemName.Flag);

        return flagItem?.imageSrc || ItemType.Flag;
    }

    toggleTab(): void {
        this.activeTab = this.activeTab === Tab.Chat ? Tab.Log : Tab.Chat;
    }

    private handleKeyPress(event: KeyboardEvent): void {
        if (event.key.toLowerCase() === Keys.D && this.gameData.clientPlayer.isAdmin) {
            this.gameplayService.emitAdminModeUpdate(this.gameData);
        }
    }
}
