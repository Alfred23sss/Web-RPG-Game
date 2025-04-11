import {
    AGGRESSIVE_ITEM_SCORE,
    ALLY_ATTACK_PENALTY,
    ATTACK_SCORE,
    DEFENSE_ATTACK_SCORE,
    DEFENSIVE_ITEM_SCORE,
    FLAG_SCORE,
    IN_RANGE_BONUS,
    INVALID_ITEM_PENALTY,
    NO_SCORE,
    NORMAL_ITEM_SCORE,
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
export class VirtualPlayerScoreService {
    constructor(
        private readonly gridManagerService: GridManagerService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}

    scoreAggressiveMoves(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move[] {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        return moves.map((move) => {
            move.score = NO_SCORE;
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby);
            this.calculateAttackScore(move, virtualPlayer);
            this.calculateItemScore(move, virtualPlayer);
            return move;
        });
    }

    scoreDefensiveMoves(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move[] {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        return moves.map((move) => {
            move.score = NO_SCORE;
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby);
            this.calculateDefensiveAttackScore(move, virtualPlayer);
            this.calculateDefensiveItemScore(move, virtualPlayer, lobby);
            return move;
        });
    }

    getVirtualPlayerTile(virtualPlayer: Player, grid: Tile[][]): Tile {
        return this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
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

    private calculateDefensiveItemScore(move: Move, virtualPlayer: Player, lobby: Lobby): void {
        if (move.type !== MoveType.Item || !move.tile.item) return;
        const item = move.tile.item;
        switch (item.name) {
            case ItemName.Swap:
            case ItemName.Rubik:
                move.score += DEFENSIVE_ITEM_SCORE;
                break;
            case ItemName.Flag:
                move.score += FLAG_SCORE;
                break;
            case ItemName.Home:
                this.handleDefensiveHomeItemScore(move, virtualPlayer, lobby);
                break;
            default:
                move.score += NORMAL_ITEM_SCORE;
        }
    }

    private handleDefensiveHomeItemScore(move: Move, virtualPlayer: Player, lobby: Lobby): void {
        const flagCarrier = this.findFlagCarrier(lobby, virtualPlayer);
        if (virtualPlayer.spawnPoint.tileId === move.tile.id) {
            const hasFlag = this.virtualPlayerActions.isFlagInInventory(virtualPlayer);
            move.score += hasFlag ? FLAG_SCORE : INVALID_ITEM_PENALTY;
        } else if (flagCarrier?.spawnPoint.tileId === move.tile.id) {
            move.score += FLAG_SCORE;
        } else {
            move.score += INVALID_ITEM_PENALTY;
        }
    }

    private calculateDefensiveAttackScore(move: Move, virtualPlayer: Player): void {
        if (move.type !== MoveType.Attack) return;
        const targetPlayer = move.tile.player;
        const sameTeam = this.virtualPlayerActions.areOnSameTeam(targetPlayer.team, virtualPlayer.team);
        if (sameTeam) {
            move.score += ALLY_ATTACK_PENALTY;
            return;
        }
        move.score += DEFENSE_ATTACK_SCORE;
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

    private findFlagCarrier(lobby: Lobby, currentPlayer: Player): Player | undefined {
        return lobby.players.find(
            (player) =>
                player.name !== currentPlayer.name &&
                player.team !== currentPlayer.team &&
                player.inventory.some((item) => item?.name === ItemName.Flag),
        );
    }
}
