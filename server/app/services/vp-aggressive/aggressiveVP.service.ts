import {
    AGGRESSIVE_ITEM_SCORE,
    ALLY_ATTACK_PENALTY,
    ATTACK_SCORE,
    FLAG_SCORE,
    IN_RANGE_BONUS,
    INVALID_ITEM_PENALTY,
    NO_SCORE,
} from '@app/constants/constants';
import { ItemName, MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AggressiveVPService {
    constructor(
        private readonly gridManagerService: GridManagerService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}

    async executeAggressiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        const nextMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        await this.executeNextMove(nextMove, virtualPlayerTile, lobby);
    }

    async executeNextMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<void> {
        switch (move.type) {
            case MoveType.Attack:
                await this.virtualPlayerActions.moveToAttack(move, virtualPlayerTile, lobby);
                console.log('att');
                break;

            case MoveType.Item:
                await this.virtualPlayerActions.pickUpItem(move, virtualPlayerTile, lobby);
                console.log('item');
                break;
        }
    }

    private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move {
        const scoredMoves = this.scoreMoves(moves, virtualPlayer, lobby);
        scoredMoves.sort((a, b) => b.score - a.score);

        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        console.table(
            scoredMoves.map((move) => ({
                type: move.type,
                item: move.tile.item?.name ?? 'attack',
                score: move.score,
                inRange: move.inRange,
                distance: this.virtualPlayerActions.calculateTotalMovementCost(
                    this.virtualPlayerActions.getPathForMove(move, virtualPlayerTile, lobby) || [],
                ),
            })),
        );

        return scoredMoves[0];
    }

    private scoreMoves(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move[] {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        return moves.map((move) => {
            move.score = NO_SCORE;
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby);
            this.calculateAttackScore(move, virtualPlayer);
            this.calculateItemScore(move, virtualPlayer);
            return move;
        });
    }

    private calculateMovementScore(move: Move, virtualPlayerTile: Tile, virtualPlayer: Player, lobby: Lobby): void {
        let movementCost = 0;
        const path = this.virtualPlayerActions.getPathForMove(move, virtualPlayerTile, lobby);
        if (!path) return;
        movementCost = this.virtualPlayerActions.calculateTotalMovementCost(path);
        move.score -= movementCost;
        move.inRange = movementCost <= virtualPlayer.movementPoints;
        if (move.inRange) move.score += IN_RANGE_BONUS;
    }

    private calculateAttackScore(move: Move, virtualPlayer: Player): void {
        if (move.type !== MoveType.Attack) return;
        const targetPlayer = move.tile.player;
        const sameTeam = this.virtualPlayerActions.areOnSameTeam(targetPlayer.team, virtualPlayer.team);
        if (sameTeam) {
            move.score += ALLY_ATTACK_PENALTY;
            return;
        }
        if (this.virtualPlayerActions.isFlagInInventory(move.tile.player)) {
            move.score += FLAG_SCORE;
            return;
        }
        move.score += ATTACK_SCORE;
    }

    private calculateItemScore(move: Move, virtualPlayer: Player): void {
        if (move.type !== MoveType.Item || !move.tile.item) return;
        const item = move.tile.item;
        switch (item.name) {
            case ItemName.Fire:
            case ItemName.Potion:
                move.score += AGGRESSIVE_ITEM_SCORE;
                break;
            case ItemName.Flag:
                move.score += FLAG_SCORE;
                break;
            case ItemName.Home:
                this.handleHomeItemScore(move, virtualPlayer);
                break;
            default:
                move.score += INVALID_ITEM_PENALTY;
                break;
        }
    }

    private handleHomeItemScore(move: Move, virtualPlayer: Player): void {
        const hasFlag = this.virtualPlayerActions.isFlagInInventory(virtualPlayer);
        const isSpawnPoint = virtualPlayer.spawnPoint.tileId === move.tile.id;
        move.score += hasFlag && isSpawnPoint ? FLAG_SCORE : INVALID_ITEM_PENALTY;
    }

    private getVirtualPlayerTile(virtualPlayer: Player, grid: Tile[][]): Tile {
        return this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
    }
}
