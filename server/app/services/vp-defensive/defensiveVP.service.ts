import { FLAG_SCORE } from '@app/constants/constants';
import { ItemName, MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Injectable } from '@nestjs/common';

const DEFENSIVE_ITEM_SCORE = 9999;
const AGGRESSIVE_ITEM_SCORE = 1000;
const IN_RANGE_BONUS = 100;
const INVALID_ITEM_PENALTY = -5000;
const NO_SCORE = 0;
const ATTACK_SCORE = 50;

@Injectable()
export class DefensiveVPService {
    constructor(
        private readonly gameCombatService: GameCombatService,
        private readonly gridManagerService: GridManagerService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}

    async executeDefensiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        if (!virtualPlayerTile) return;
        const nextMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        if (!nextMove) {
            return;
        }

        const path = this.virtualPlayerActions.getPathForMove(nextMove, virtualPlayerTile, lobby);
        if (!path || path.length === 0) return;

        const partialPath = this.getPathWithLimitedCost(path, virtualPlayer.movementPoints);

        if (partialPath.length <= 1 && nextMove.inRange) {
            if (partialPath.length === 2) {
                this.moveAlongPath(partialPath, virtualPlayerTile, lobby);
            }

            const updatedTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
            await this.executeNextMove(nextMove, updatedTile, lobby);
        } else {
            this.moveAlongPath(partialPath, virtualPlayerTile, lobby);
        }
    }

    async tryToEscapeIfWounded(virtualPlayer: Player, accessCode: string): Promise<boolean> {
        const isInCombat = this.gameCombatService.isCombatActive(accessCode);
        if (!isInCombat) return false;
        const combatState = this.gameCombatService.getCombatState(accessCode);
        if (!combatState || combatState.currentFighter.name !== virtualPlayer.name) return false;
        const healthRatio = virtualPlayer.hp.current / virtualPlayer.hp.max;
        if (healthRatio < 1) {
            console.log('🚨 Trying to escape...');
            this.gameCombatService.attemptEscape(accessCode, virtualPlayer);
            return true;
        }
        return false;
    }
    private async executeNextMove(move: Move, virtualPlayerTile: Tile, lobby: Lobby): Promise<void> {
        switch (move.type) {
            case MoveType.Attack:
                await this.virtualPlayerActions.moveToAttack(move, virtualPlayerTile, lobby);
                break;
            case MoveType.Item:
                await this.virtualPlayerActions.pickUpItem(move, virtualPlayerTile, lobby);
                break;
            default:
                console.log('Type de move non géré:', move.type);
        }
    }

    private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move | undefined {
        if (moves.length === 0) return undefined;
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        const scoredMoves = this.scoreMoves(moves, virtualPlayer, lobby);
        scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
        console.table(
            scoredMoves.map((move) => ({
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
            this.calculateItemScore(move, virtualPlayer);
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby);
            this.calculateAttackScore(move, virtualPlayer);
            return move;
        });
    }

    private calculateItemScore(move: Move, virtualPlayer: Player): void {
        if (move.type !== MoveType.Item || !move.tile.item) return;
        const item = move.tile.item;
        switch (item.name) {
            case ItemName.Swap:
                move.score += DEFENSIVE_ITEM_SCORE;
                break;
            case ItemName.Potion:
                move.score += AGGRESSIVE_ITEM_SCORE;
                break;
            case ItemName.Fire:
                move.score += AGGRESSIVE_ITEM_SCORE;
                break;
            case ItemName.Rubik:
                move.score += DEFENSIVE_ITEM_SCORE;
                break;
            //normalement seulement lorsque le joueur a le FLAG
            case ItemName.Home:
                if ((virtualPlayer.spawnPoint.tileId = move.tile.id)) {
                    move.score += this.isFlagInInventory(virtualPlayer) ? FLAG_SCORE : INVALID_ITEM_PENALTY;
                } else {
                    move.score += INVALID_ITEM_PENALTY;
                }
                break;
            default:
                move.score += -Infinity;
        }
    }

    private calculateMovementScore(move: Move, virtualPlayerTile: Tile, virtualPlayer: Player, lobby: Lobby): void {
        let movementCost = 0;
        const path = this.virtualPlayerActions.getPathForMove(move, virtualPlayerTile, lobby);
        if (path) {
            movementCost = this.virtualPlayerActions.calculateTotalMovementCost(path);
            if (movementCost > virtualPlayer.movementPoints) {
                move.score -= movementCost * IN_RANGE_BONUS;
            }
            move.inRange = movementCost <= virtualPlayer.movementPoints;
        }
    }

    private calculateAttackScore(move: Move, virtualPlayer: Player): void {
        if (move.type !== MoveType.Attack) return;
        const inventoryFull = virtualPlayer.inventory.filter((i) => i !== null).length >= 2;
        if (inventoryFull) {
            move.score += ATTACK_SCORE;
            if (this.isFlagInInventory(move.tile.player)) {
                move.score += FLAG_SCORE;
            }
        } else {
            move.score += INVALID_ITEM_PENALTY;
        }
    }

    private isFlagInInventory(player: Player): boolean {
        if (!player || !player.inventory) return false;
        return player.inventory.some((item) => item && item.name === ItemName.Flag);
    }

    private getVirtualPlayerTile(virtualPlayer: Player, grid: Tile[][]): Tile {
        return this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
    }

    private getPathWithLimitedCost(path: Tile[], maxCost: number): Tile[] {
        const limitedPath: Tile[] = [path[0]];
        let totalCost = 0;

        for (let i = 1; i < path.length; i++) {
            const tile = path[i];
            const cost = this.virtualPlayerActions.getMoveCost(tile);

            if (totalCost + cost > maxCost) break;

            totalCost += cost;
            limitedPath.push(tile);
        }

        return limitedPath;
    }

    private moveAlongPath(path: Tile[], fromTile: Tile, lobby: Lobby): void {
        this.virtualPlayerActions.moveAlongPartialPath(path, fromTile, lobby);
    }
}
