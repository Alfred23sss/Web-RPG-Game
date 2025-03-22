import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameData } from '@app/classes/gameData';
import { GridComponent } from '@app/components/grid/grid.component';
import { Tile } from '@app/interfaces/tile';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-page',
    standalone: true,
    templateUrl: './game-page.component.html',
    styleUrls: ['./game-page.component.scss'],
    imports: [CommonModule, GridComponent],
})
export class GamePageComponent implements OnInit, OnDestroy {
    gameData: GameData = new GameData();
    activeTab: 'chat' | 'log' = 'chat';
    private keyPressHandler: (event: KeyboardEvent) => void;
    private gameDataSubscription: Subscription;

    constructor(
        private readonly gameplayService: GameplayService,
        private readonly gameSocketService: GameSocketService,
    ) {}

    ngOnInit(): void {
        this.gameDataSubscription = this.gameSocketService.gameData$.subscribe((data) => {
            this.gameData = data;
        });

        this.gameSocketService.initializeSocketListeners();
        this.keyPressHandler = this.handleKeyPress.bind(this);
        document.addEventListener('keydown', this.keyPressHandler);
    }

    handleDoorClick(targetTile: Tile): void {
        this.gameplayService.handleDoorClick(this.gameData, targetTile);
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
        document.removeEventListener('keydown', this.keyPressHandler);
        this.gameSocketService.unsubscribeSocketListeners();
        sessionStorage.setItem('refreshed', 'false');
    }

    attack(): void {
        this.gameplayService.attack(this.gameData);
    }

    evade(): void {
        this.gameplayService.evade(this.gameData);
    }

    private handleKeyPress(event: KeyboardEvent): void {
        if (event.key.toLowerCase() === 'd' && this.gameData.clientPlayer.isAdmin) {
            this.gameplayService.emitAdminModeUpdate(this.gameData);
        }
    }
}
