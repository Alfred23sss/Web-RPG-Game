import { ItemName, MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';
import { GameCombatService } from '../combat-manager/combat-manager.service';
import { GridManagerService } from '../grid-manager/grid-manager.service';
import { VirtualPlayerActionsService } from '../virtualPlayer-actions/virtualPlayerActions.service';

const DEFENSIVE_ITEM_SCORE = 1000;
const AGGRESSIVE_ITEM_SCORE = 150;
const IN_RANGE_BONUS = 500;
const INVALID_ITEM_PENALTY = -200;
const ATTACK_PENALTY = -5000;

@Injectable()
export class DefensiveVPService {
    constructor(
        private readonly lobbyService: LobbyService,
        private readonly gameCombatService: GameCombatService,
        private readonly gridManagerService: GridManagerService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}
    private targetTiles = new Map<string, Tile>();

    // async executeDefensiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
    //     const bestMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
    //     const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
    //     if (!virtualPlayerTile || !bestMove) return;
    //     if (!virtualPlayerTile || !bestMove || !bestMove.inRange) return;

    //     switch (bestMove.type) {
    //         case MoveType.Item:
    //             this.virtualPlayerActions.pickUpItem(bestMove, virtualPlayerTile, lobby);
    //             break;
    //         // case MoveType.Attack:
    //         //     this.virtualPlayerActions.moveToAttack(bestMove, virtualPlayerTile, lobby);
    //         //     break;
    //     }
    // }
    async executeDefensiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        if (!virtualPlayerTile) return;

        const currentTarget = this.targetTiles.get(virtualPlayer.name);

        if (currentTarget) {
            const fakeMove: Move = {
                tile: currentTarget,
                type: MoveType.Item,
                inRange: false,
            };

            const fullPath = this.virtualPlayerActions.getPathForMove(fakeMove, virtualPlayerTile, lobby);
            if (!fullPath || fullPath.length === 0 || !currentTarget.item) {
                this.targetTiles.delete(virtualPlayer.name);
                return;
            }

            const partialPath = this.getPathWithLimitedCost(fullPath, virtualPlayer.movementPoints);
            if (partialPath.length > 1) {
                this.moveAlongPath(partialPath, virtualPlayerTile, lobby);
            }
            return;
        }

        const bestMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        if (!bestMove) return;

        if (bestMove.inRange) {
            this.virtualPlayerActions.pickUpItem(bestMove, virtualPlayerTile, lobby);
            return;
        }

        this.targetTiles.set(virtualPlayer.name, bestMove.tile);
        const path = this.virtualPlayerActions.getPathForMove(bestMove, virtualPlayerTile, lobby);
        if (!path) return;

        const partialPath = this.getPathWithLimitedCost(path, virtualPlayer.movementPoints);
        if (partialPath.length > 1) {
            this.moveAlongPath(partialPath, virtualPlayerTile, lobby);
        }
    }

    // private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move {
    //     const scoredMoves = this.scoreMoves(moves, virtualPlayer, lobby);
    //     scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
    //     return scoredMoves[0];
    // }
    private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move | undefined {
        const itemMoves = moves.filter((move) => move.type === MoveType.Item);
        if (itemMoves.length === 0) return undefined;

        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        const scoredMoves = this.scoreMoves(itemMoves, virtualPlayer, lobby);

        scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
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
