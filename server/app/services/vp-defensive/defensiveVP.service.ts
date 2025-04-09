import { DEFENSIVE_ITEM_ORDER } from '@app/constants/constants';
import { ItemName, MoveType } from '@app/enums/enums';
import { Item } from '@app/interfaces/Item';
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
const IN_RANGE_BONUS = 500;
const INVALID_ITEM_PENALTY = -200;
const ATTACK_PENALTY = -1000;
const NO_SCORE = 0;

@Injectable()
export class DefensiveVPService {
    constructor(
        private readonly gameCombatService: GameCombatService,
        private readonly gridManagerService: GridManagerService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}
    private targetTiles = new Map<string, Tile>();

    async executeDefensiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        if (!virtualPlayerTile) return;

        const bestMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        if (!bestMove) return;

        const path = this.virtualPlayerActions.getPathForMove(bestMove, virtualPlayerTile, lobby);
        if (!path || path.length === 0) return;

        const partialPath = this.getPathWithLimitedCost(path, virtualPlayer.movementPoints);

        if (partialPath.length <= 1) {
            this.virtualPlayerActions.pickUpItem(bestMove, virtualPlayerTile, lobby);
            return;
        }

        this.moveAlongPath(partialPath, virtualPlayerTile, lobby);
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

    private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move | undefined {
        const itemMoves = moves.filter((move) => move.type === MoveType.Item);
        if (itemMoves.length === 0) return undefined;

        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        const scoredMoves = this.scoreMoves(itemMoves, virtualPlayer, lobby);

        scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
        console.table(
            scoredMoves.map((move) => ({
                item: move.tile.item?.name ?? '???',
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
            move.score = 0;
            this.calculateItemScore(move);
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby);

            this.calculateAttackScore(move);

            return move;
        });
    }

    private calculateMovementScore(move: Move, virtualPlayerTile: Tile, virtualPlayer: Player, lobby: Lobby): void {
        let movementCost = 0;
        const path = this.virtualPlayerActions.getPathForMove(move, virtualPlayerTile, lobby);

        if (path) {
            movementCost = this.virtualPlayerActions.calculateTotalMovementCost(path);

            if (movementCost > virtualPlayer.movementPoints) {
                if (move.tile.item?.name !== ItemName.Swap) {
                    move.score = -Infinity;
                    return;
                }
            }

            if (move.tile.item?.name !== ItemName.Swap) {
                move.score -= movementCost;
            }

            move.inRange = movementCost <= virtualPlayer.movementPoints;
        }
    }

    private calculateItemScore(move: Move): void {
        if (move.type !== MoveType.Item || !move.tile.item) return;

        const item = move.tile.item;

        switch (item.name) {
            case ItemName.Swap:
                console.log('✅ Item Swap reconnu, score += DEFENSIVE_ITEM_SCORE');
                move.score += DEFENSIVE_ITEM_SCORE; // priorité absolue
                break;
            case ItemName.Potion:
                move.score += 150;
                break;
            case ItemName.Fire:
            case ItemName.Rubik:
                move.score += 100;
                break;
            default:
                move.score += INVALID_ITEM_PENALTY;
        }
    }

    private calculateAttackScore(move: Move): void {
        if (move.type === MoveType.Attack) {
            move.score = ATTACK_PENALTY;
        }
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
        const move: Move = {
            tile: path.at(-1),
            type: MoveType.Item,
            inRange: true,
        };

        this.virtualPlayerActions.pickUpItem(move, fromTile, lobby);
    }
}
