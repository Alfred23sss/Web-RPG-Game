import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GridComponent } from '@app/components/grid/grid.component';
import { Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Tile } from '@app/interfaces/tile';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';

const playerMovement = 3;

@Component({
    selector: 'app-game-page',
    standalone: true,
    templateUrl: './game-page.component.html',
    styleUrls: ['./game-page.component.scss'],
    imports: [CommonModule, GridComponent],
})
export class GamePageComponent implements OnInit {
    gameName: string = '';
    gameDescription: string = '';
    game: Game | undefined;
    availablePath: Tile[] | undefined;
    quickestPath: Tile[] | undefined;
    playerTile: Tile | undefined;
    lobby: Lobby;
    defaultLobby: Lobby = {
        isLocked: false,
        accessCode: '',
        players: [],
        game: null,
        maxPlayers: 0,
    }; // moche

    constructor(
        private gameService: GameService,
        private gridService: GridService,
        private playerMovementService: PlayerMovementService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        const storedLobby = sessionStorage.getItem('lobby');
        this.lobby = storedLobby ? (JSON.parse(storedLobby) as Lobby) : this.defaultLobby; // moche
        this.game = this.gameService.getCurrentGame(); // moche
        this.gridService.setGrid(this.game?.grid);
        if (this.game && this.game.grid) {
            this.availablePath = this.playerMovementService.availablePath(this.game.grid[1][7], playerMovement);
        }
    }

    updateQuickestPath(targetTile: Tile): void {
        if (!(this.game && this.game.grid) || !this.isAvailablePath(targetTile)) {
            this.quickestPath = undefined;
        } else {
            this.playerTile = this.game.grid[1][7];
            this.quickestPath = this.playerMovementService.quickestPath(this.playerTile, targetTile) || [];
        }
    }

    backToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    private isAvailablePath(tile: Tile): boolean {
        return this.availablePath ? this.availablePath.some((t) => t.id === tile.id) : false;
    }
}
