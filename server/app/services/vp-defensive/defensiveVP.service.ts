import { ItemName, MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Injectable } from '@nestjs/common';

const DEFENSIVE_ITEM_SCORE = 100;
const IN_RANGE_BONUS = 1000;
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
    async executeDefensiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        const bestMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        if (!virtualPlayerTile || !bestMove) return;

        switch (bestMove.type) {
            case MoveType.Item:
                await this.virtualPlayerActions.pickUpItem(bestMove, virtualPlayerTile, lobby);
                break;
            case MoveType.Attack:
                await this.virtualPlayerActions.moveToAttack(bestMove, virtualPlayerTile, lobby);
                break;
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

    private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move {
        const scoredMoves = this.scoreMoves(moves, virtualPlayer, lobby);
        scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
        return scoredMoves[0];
    }

    private scoreMoves(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move[] {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        return moves.map((move) => {
            move.score = NO_SCORE;
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby);
            this.calculateItemScore(move);
            this.calculateAttackScore(move);

            return move;
        });
    }

    private calculateMovementScore(move: Move, virtualPlayerTile: Tile, virtualPlayer: Player, lobby: Lobby): void {
        let movementCost = 0;
        const path = this.virtualPlayerActions.getPathForMove(move, virtualPlayerTile, lobby);

        if (path) {
            movementCost = this.virtualPlayerActions.calculateTotalMovementCost(path);
            move.score -= movementCost;

            if (movementCost <= virtualPlayer.movementPoints) {
                move.inRange = true;
                move.score += IN_RANGE_BONUS;
            }
        }
    }

    private calculateItemScore(move: Move): void {
        if (move.type !== MoveType.Item || !move.tile.item) return;

        const item = move.tile.item;
        const isDefensive = item.name === ItemName.Swap;

        if (isDefensive) {
            move.score += DEFENSIVE_ITEM_SCORE;
        } else {
            move.score += INVALID_ITEM_PENALTY;
        }
    }

    private calculateAttackScore(move: Move): void {
        if (move.type === MoveType.Attack) {
            move.score += ATTACK_PENALTY;
        }
    }

    private getVirtualPlayerTile(virtualPlayer: Player, grid: Tile[][]): Tile {
        return this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
    }
}
