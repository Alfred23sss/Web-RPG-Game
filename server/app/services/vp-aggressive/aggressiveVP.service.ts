import { VP_ACTION_WAIT_TIME_MS } from '@app/constants/constants';
import { ItemName, MoveType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { PlayerMovementService } from '@app/services/player-movement/playerMovement.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

const ATTACK_SCORE = 100;
const NO_SCORE = 0;
const AGGRESSIVE_ITEM_SCORE = 50;
const IN_RANGE_BONUS = 1000;
const INVALID_ITEM_PENALTY = -10000;

@Injectable()
export class AggressiveVPService {
    constructor(
        private readonly playerMovementService: PlayerMovementService,
        private readonly gridManagerService: GridManagerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly gameCombatService: GameCombatService,
    ) {}

    async executeAggressiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        const nextMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        this.executeNextMove(nextMove, virtualPlayerTile, lobby);
    }

    executeNextMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): void {
        switch (move.type) {
            case MoveType.Attack:
                this.moveToAttack(move, virtualPlayerTile, lobby);
                break;

            case MoveType.Item:
                this.executeMove(move, virtualPlayerTile, lobby);
                break;
        }
    }

    private moveToAttack(move: Move, virtualPlayerTile: Tile, lobby: Lobby): void {
        this.executeMove(move, virtualPlayerTile, lobby);
        // this.executeAction(lobby.accessCode, currentPosition, move.tile);
    }

    private executeMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): void {
        const movement = this.getMovement(move, virtualPlayerTile, lobby.game.grid);
        const payload = {
            virtualPlayerTile,
            closestReachableTile: move.tile,
            movement,
            accessCode: lobby.accessCode,
        };
        this.emitEvent(VirtualPlayerEvents.VirtualPlayerMove, payload);
    }

    private getMovement(move: Move, virtualPlayerTile: Tile, grid: Tile[][]): Tile[] {
        let closestReachableTile: Tile;
        if (move.type === MoveType.Attack && move.tile.player) {
            const movePoints = virtualPlayerTile.player.movementPoints;
            closestReachableTile = this.playerMovementService.findClosestReachableTile(move.tile, virtualPlayerTile, grid, movePoints);
        } else {
            closestReachableTile = move.tile;
        }
        if (closestReachableTile) {
            return this.playerMovementService.quickestPath(virtualPlayerTile, closestReachableTile, grid);
        }
    }

    private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move {
        const scoredMoves = this.scoreMoves(moves, virtualPlayer, lobby);
        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves[0];
    }

    private scoreMoves(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move[] {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        return moves.map((move) => {
            move.score = NO_SCORE;
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby);
            this.calculateAttackScore(move);
            this.calculateItemScore(move);
            return move;
        });
    }

    private calculateMovementScore(move: Move, virtualPlayerTile: Tile, virtualPlayer: Player, lobby: Lobby): void {
        let movementCost = 0;
        const path = this.getPathForMove(move, virtualPlayerTile, virtualPlayer, lobby);
        if (path) {
            movementCost = this.calculateTotalMovementCost(path);
            console.log(move.tile.id, movementCost);
            move.score -= movementCost;

            if (movementCost <= virtualPlayer.movementPoints) {
                move.inRange = true;
            }
        }

        if (move.inRange) {
            move.score += IN_RANGE_BONUS;
        }
    }

    private calculateTotalMovementCost(path: Tile[]): number {
        return path.slice(1).reduce((total, tile) => total + this.playerMovementService.getMoveCost(tile), 0);
    }

    private getPathForMove(move: Move, virtualPlayerTile: Tile, virtualPlayer: Player, lobby: Lobby): Tile[] | undefined {
        if (move.type === MoveType.Attack && move.tile.player) {
            const adjacentTileToPlayer = this.playerMovementService.findBestMoveTile(move.tile, virtualPlayerTile, lobby.game.grid);
            if (adjacentTileToPlayer) {
                return this.playerMovementService.quickestPath(virtualPlayerTile, adjacentTileToPlayer, lobby.game.grid);
            }
        } else {
            return this.playerMovementService.quickestPath(virtualPlayerTile, move.tile, lobby.game.grid);
        }
    }

    private calculateAttackScore(move: Move): void {
        if (move.type === MoveType.Attack) {
            move.score += ATTACK_SCORE;
        }
    }

    private calculateItemScore(move: Move): void {
        if (move.type === MoveType.Item) {
            if (move.tile.item.name === ItemName.Potion || move.tile.item.name === ItemName.Fire) {
                move.score += AGGRESSIVE_ITEM_SCORE;
            } else {
                move.score += INVALID_ITEM_PENALTY; // (fait en sorte quil ignore les autres items jsp si c good??)
            }
        }
    }

    private async executeAction(accessCode: string, currentTile: Tile, actionTile: Tile | undefined): Promise<void> {
        if (actionTile) {
            // Wrap setTimeout in a Promise
            await new Promise((resolve) => setTimeout(resolve, VP_ACTION_WAIT_TIME_MS));
            this.gameCombatService.startCombat(accessCode, currentTile.player.name, actionTile.player.name);
        }
    }

    private getVirtualPlayerTile(virtualPlayer: Player, grid: Tile[][]): Tile {
        return this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
