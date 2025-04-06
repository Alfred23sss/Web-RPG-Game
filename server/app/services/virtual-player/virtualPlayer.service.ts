import { Behavior, EventEmit, ItemName, MoveType } from '@app/enums/enums';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { PlayerMovementService } from '@app/services/player-movement/playerMovement.service';
import { AggressiveVPService } from '@app/services/vp-aggressive/aggressiveVP.service';
import { DefensiveVPService } from '@app/services/vp-defensive/defensiveVP.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class VirtualPlayerService implements OnModuleInit {
    private virtualPlayer: VirtualPlayer;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly aggressiveVPService: AggressiveVPService,
        private readonly defensiveVPService: DefensiveVPService,
        private readonly lobbyService: LobbyService,
        private readonly playerMovementService: PlayerMovementService,
    ) {}

    onModuleInit() {
        this.eventEmitter.on(EventEmit.GameTurnStarted, ({ accessCode, player }) => {
            if (player.isVirtual) {
                this.virtualPlayer = player;
                console.log(this.virtualPlayer.movementPoints);
                this.executeVirtualPlayerTurn(accessCode);
            }
        });
    }

    private async executeVirtualPlayerTurn(accessCode: string): Promise<void> {
        const lobby = this.lobbyService.getLobby(accessCode);
        const moves = this.findAllMoves(lobby.game.grid);
        // const movesInRange = this.getMovesInRange(possibleMoves, this.virtualPlayer, lobby.game.grid);
        switch (this.virtualPlayer.behavior) {
            case Behavior.Aggressive:
                await this.aggressiveVPService.executeAggressiveBehavior(this.virtualPlayer, lobby, moves);
                break;
            case Behavior.Defensive:
                // await this.defensiveVPService.execute(this.virtualPlayer, lobby, possibleMoves, movesInRange);
                break;
        }

        // this.eventEmitter.emit(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode });
    }

    private findAllMoves(grid: Tile[][]): Move[] {
        const playerMoves = this.findPlayers(grid);
        const itemMoves = this.findItems(grid);

        return [...playerMoves, ...itemMoves];
    }

    private isMoveInRange(targetTile: Tile, startTile: Tile, grid: Tile[][], maxMovement: number): boolean {
        const reachableTiles = this.playerMovementService.availablePath(startTile, maxMovement, grid);
        if (targetTile.player) {
            const adjacentTiles = this.playerMovementService.getNeighbors(targetTile, grid);
            return adjacentTiles.some((adjTile) => reachableTiles.includes(adjTile) && adjTile.player === undefined);
        }
        return reachableTiles.includes(targetTile);
    }

    private findPlayers(grid: Tile[][]): Move[] {
        return grid.flatMap((row) =>
            row
                .filter((tile) => tile.player && tile.player.name !== this.virtualPlayer.name)
                .map((tile) => ({
                    tile,
                    type: MoveType.Attack,
                    inRange: false,
                })),
        );
    }

    private findItems(grid: Tile[][]): Move[] {
        return grid.flatMap((row) =>
            row
                .filter((tile) => tile.item && tile.item.name !== ItemName.Home)
                .map((tile) => ({
                    tile,
                    type: MoveType.Item,
                    inRange: false,
                })),
        );
    }

    private hasRemainingActions(): boolean {
        return this.virtualPlayer.actionPoints > 0 || this.virtualPlayer.movementPoints > 0;
    }

    private findTileByPlayer(grid: Tile[][], player: Player): Tile | undefined {
        return grid.flat().find((tile) => tile.player?.name === player.name);
    }

    // private getMovesInRange(allMoves: Move[], virtualPlayer: Player, grid: Tile[][]): Move[] {
    //     if (!virtualPlayer || !grid) return [];

    //     const virtualPlayerTile = this.findTileByPlayer(grid, virtualPlayer);
    //     if (!virtualPlayerTile) return [];

    //     return allMoves.map((move) => ({
    //         ...move,
    //         inRange: this.isMoveInRange(move.tile, virtualPlayerTile, grid, virtualPlayer.movementPoints),
    //     }));
    // }

    // private filterTilesByMovementRange(tiles: Tile[], startTile: Tile, grid: Tile[][], maxMovement: number): Tile[] {
    //     return tiles.filter((targetTile) => {
    //         const reachableTiles = this.playerMovementService.availablePath(startTile, maxMovement, grid);
    //         if (targetTile.player !== undefined) {
    //             const adjacentTiles = this.playerMovementService.getNeighbors(targetTile, grid);
    //             return adjacentTiles.some((adjacentTile) => reachableTiles.includes(adjacentTile) && adjacentTile.player === undefined);
    //         }
    //         if (reachableTiles.includes(targetTile)) return true;
    //         const path = this.playerMovementService.quickestPath(startTile, targetTile, grid);
    //         if (!path) return false;
    //         const totalCost = path.reduce((sum, tile) => sum + this.playerMovementService.getMoveCost(tile), 0);
    //         return totalCost <= maxMovement;
    //     });
    // }
}
