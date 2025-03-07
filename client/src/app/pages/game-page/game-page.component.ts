import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GridComponent } from '@app/components/grid/grid.component';
import { Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
// import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

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
    game: Game | null;
    currentPlayer: Player;
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
        // private gameService: GameService,
        private gridService: GridService,
        private playerMovementService: PlayerMovementService,
        private router: Router,
        private socketClientService: SocketClientService,
    ) {}

    ngOnInit(): void {
        const lobby = sessionStorage.getItem('lobby');
        this.lobby = lobby ? (JSON.parse(lobby) as Lobby) : this.lobby;
        const currentPlayer = sessionStorage.getItem('player');
        this.currentPlayer = currentPlayer ? (JSON.parse(currentPlayer) as Player) : this.currentPlayer;

        // tres moche ^^^ si quelquun trouve meilleur syntaxe hesiter pas a changer ^^^
        this.game = this.lobby.game; // moche
        this.gridService.setGrid(this.game?.grid);
        if (this.game && this.game.grid) {
            this.availablePath = this.playerMovementService.availablePath(this.game.grid[1][7], playerMovement);
        }

        this.socketClientService.onAbandonGame((data) => {
            console.log('Received abandoned game event for:', data.playerName);

            const abandonedPlayer = this.lobby.players.find((player) => player.name === data.playerName);

            if (abandonedPlayer) {
                abandonedPlayer.hasAbandoned = true;
                console.log(`${data.playerName} has abandoned the game`);
            }
        });
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

    endTurn(): void {
        console.log('Tour terminé !');
    }

    executeNextAction(): void {
        console.log('Action exécutée !');
    }
    abandonGame(): void {
        this.currentPlayer.hasAbandoned = true;
        this.socketClientService.abandonGame(this.currentPlayer.name);
        this.backToHome();
    }

    private isAvailablePath(tile: Tile): boolean {
        return this.availablePath ? this.availablePath.some((t) => t.id === tile.id) : false;
    }
}
