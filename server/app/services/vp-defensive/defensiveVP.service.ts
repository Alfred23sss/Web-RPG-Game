import {
    ACTION_MAX_MS,
    ACTION_MIN_MS,
    ALLY_ATTACK_PENALTY,
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
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DefensiveVPService {
    constructor(
        private readonly gameCombatService: GameCombatService,
        private readonly gridManagerService: GridManagerService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}

    async executeDefensiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        const nextMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        await this.executeNextMove(nextMove, virtualPlayerTile, lobby);
    }

    async tryToEscapeIfWounded(virtualPlayer: Player, accessCode: string): Promise<boolean> {
        const isInCombat = this.gameCombatService.isCombatActive(accessCode);
        if (!isInCombat) return false;
        const combatState = this.gameCombatService.getCombatState(accessCode);
        if (!combatState || combatState.currentFighter.name !== virtualPlayer.name) return false;
        const healthRatio = virtualPlayer.hp.current / virtualPlayer.hp.max;
        if (healthRatio < 1) {
            await new Promise((resolve) => setTimeout(resolve, this.virtualPlayerActions.getRandomDelay(ACTION_MIN_MS, ACTION_MAX_MS)));
            this.gameCombatService.attemptEscape(accessCode, virtualPlayer);
            return true;
        }
        return false;
    }

    private async executeNextMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<void> {
        switch (move.type) {
            case MoveType.Attack:
                console.log('att');
                await this.virtualPlayerActions.moveToAttack(move, virtualPlayerTile, lobby);

                break;
            case MoveType.Item:
                console.log('item');
                await this.virtualPlayerActions.pickUpItem(move, virtualPlayerTile, lobby);
                break;
        }
    }

    private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move | undefined {
        if (moves.length === 0) return undefined;
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        const scoredMoves = this.scoreMoves(moves, virtualPlayer, lobby);
        scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));

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
            this.calculateItemScore(move, virtualPlayer, lobby);
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby);
            this.calculateAttackScore(move, virtualPlayer);
            return move;
        });
    }

    private calculateItemScore(move: Move, virtualPlayer: Player, lobby: Lobby): void {
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
                this.handleHomeItemScore(move, virtualPlayer, lobby);
                break;
            default:
                move.score += NORMAL_ITEM_SCORE;
        }
    }
    private handleHomeItemScore(move: Move, virtualPlayer: Player, lobby: Lobby): void {
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
        move.score += DEFENSE_ATTACK_SCORE;
    }
    private getVirtualPlayerTile(virtualPlayer: Player, grid: Tile[][]): Tile {
        return this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
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
