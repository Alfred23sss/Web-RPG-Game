import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { GameData } from '@app/classes/gameData';
import { ChatComponent } from '@app/components/chat/chat.component';
import { GameCombatComponent } from '@app/components/game-combat/game-combat.component';
import { GridComponent } from '@app/components/grid/grid.component';
import { LogBookComponent } from '@app/components/log-book/log-book.component';
import { PlayerInfoComponent } from '@app/components/player-info/player-info.component';
import { ItemName, ItemType, TeamType } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SocketListenerService } from '@app/services/socket-listener/socket-listener.service';
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
    activeTab: 'chat' | 'log' = 'chat';
    private keyPressHandler: (event: KeyboardEvent) => void;
    private gameDataSubscription: Subscription;

    constructor(
        private readonly dialog: MatDialog,
        private readonly gameplayService: GameplayService,
        private readonly gameStateSocketService: GameStateSocketService,
        private readonly socketListenerService: SocketListenerService,
    ) {}

    ngOnInit(): void {
        this.gameDataSubscription = this.gameStateSocketService.gameData$.subscribe((data) => {
            this.gameData = data;
        });

        this.socketListenerService.initializeAllSocketListeners();
        this.keyPressHandler = this.handleKeyPress.bind(this);
        document.addEventListener('keydown', this.keyPressHandler);
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
        this.gameplayService.abandonGame(this.gameData, this.gameData.isGameEnding);
    }

    ngOnDestroy(): void {
        if (this.gameDataSubscription) {
            this.gameDataSubscription.unsubscribe();
        }
        document.removeEventListener('keydown', this.keyPressHandler);
        this.socketListenerService.unsubscribeSocketListeners();
        sessionStorage.setItem('refreshed', 'false');
    }

    attack(): void {
        this.gameplayService.attack(this.gameData);
    }

    evade(): void {
        this.gameplayService.evade(this.gameData);
    }

    openCombatPopup(): void {
        this.dialog.open(GameCombatComponent, {
            width: '650px',
            disableClose: true,
        });
    }

    hasFlag(player: Player): boolean {
        return player.inventory.some((item) => item?.name.toLowerCase() === ItemName.Flag);
    }

    getFlagImage(player: Player): string {
        const flagItem = player.inventory.find((item) => item !== null && item.name === ItemName.Flag);

        return flagItem?.imageSrc || ItemType.Flag;
    }

    private handleKeyPress(event: KeyboardEvent): void {
        if (event.key.toLowerCase() === 'd' && this.gameData.clientPlayer.isAdmin) {
            this.gameplayService.emitAdminModeUpdate(this.gameData);
        }
    }
}
