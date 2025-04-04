import { Behavior, EventEmit, ItemName } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { VPMoveType } from '@app/interfaces/VPMoveTypes';
import { TileType } from '@app/model/database/tile';
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
                this.executeVirtualPlayerTurn(accessCode);
            }
        });
    }

    private async executeVirtualPlayerTurn(accessCode: string): Promise<void> {
        const lobby = this.lobbyService.getLobby(accessCode);

        // while (this.hasRemainingActions()) {
        const possibleMoves = this.findAllMoves(lobby.game.grid);
        const movesInRange = this.getMovesInRange(possibleMoves, this.virtualPlayer, lobby.game.grid);
        if (this.virtualPlayer.behavior === Behavior.Aggressive) {
            await this.aggressiveVPService.executeAggressiveBehavior(this.virtualPlayer, lobby, possibleMoves, movesInRange);
        } else if (this.virtualPlayer.behavior === Behavior.Defensive) {
            // add defense behavior function(s)
        }
        // }

        this.eventEmitter.emit(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode });
    }

    private findAllMoves(grid: Tile[][]): VPMoveType {
        const playerTiles = this.findPlayers(grid);
        const itemTiles = this.findItems(grid);
        const doors = this.findDoors(grid);

        return {
            playerTiles,
            itemTiles,
            doors,
        };
    }

    private getMovesInRange(allMoves: VPMoveType, virtualPlayer: Player, grid: Tile[][]): VPMoveType {
        if (!virtualPlayer || !grid) return { playerTiles: [], itemTiles: [], doors: [] };

        const virtualPlayerTile = this.findTileByPlayer(grid, virtualPlayer);
        if (!virtualPlayerTile) return { playerTiles: [], itemTiles: [], doors: [] };

        return {
            playerTiles: this.filterTilesByMovementRange(allMoves.playerTiles, virtualPlayerTile, grid, virtualPlayer.movementPoints),
            itemTiles: this.filterTilesByMovementRange(allMoves.itemTiles, virtualPlayerTile, grid, virtualPlayer.movementPoints),
            doors: this.filterTilesByMovementRange(allMoves.doors, virtualPlayerTile, grid, virtualPlayer.movementPoints),
        };
    }

    private filterTilesByMovementRange(tiles: Tile[], startTile: Tile, grid: Tile[][], maxMovement: number): Tile[] {
        return tiles.filter((targetTile) => {
            const reachableTiles = this.playerMovementService.availablePath(startTile, maxMovement, grid);
            if (targetTile.player !== undefined) {
                const adjacentTiles = this.playerMovementService.getNeighbors(targetTile, grid);
                return adjacentTiles.some((adjacentTile) => reachableTiles.includes(adjacentTile) && adjacentTile.player === undefined);
            }
            if (reachableTiles.includes(targetTile)) return true;
            const path = this.playerMovementService.quickestPath(startTile, targetTile, grid);
            if (!path) return false;
            const totalCost = path.reduce((sum, tile) => sum + this.playerMovementService.getMoveCost(tile), 0);
            return totalCost <= maxMovement;
        });
    }

    private findPlayers(grid: Tile[][]): Tile[] {
        return grid.flatMap((row) => row.filter((tile) => tile.player && tile.player.name !== this.virtualPlayer.name));
    }

    private findItems(grid: Tile[][]): Tile[] {
        return grid.flatMap((row) => row.filter((tile) => tile.item && tile.item.name !== ItemName.Home));
    }

    private findDoors(grid: Tile[][]): Tile[] {
        return grid.flatMap((row) => row.filter((tile) => tile.type === TileType.Door));
    }

    private hasRemainingActions(): boolean {
        return this.virtualPlayer.actionPoints > 0 || this.virtualPlayer.movementPoints > 0;
    }

    private findTileByPlayer(grid: Tile[][], player: Player): Tile | undefined {
        return grid.flat().find((tile) => tile.player?.name === player.name);
    }
}
