import { TileType } from '@app/enums/enums';
import { CombatState } from '@app/interfaces/CombatState';
import { DiceType } from '@app/interfaces/Dice';
import { Player } from '@app/model/database/player';
import { Tile } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { Injectable } from '@nestjs/common';

const ICE_PENALTY = -2;

@Injectable()
export class CombatHelperService {
    constructor(private readonly gridManagerService: GridManagerService) {}

    determineCombatOrder(attacker: Player, defender: Player): Player[] {
        if (attacker.speed === defender.speed) {
            return [attacker, defender];
        }
        return attacker.speed > defender.speed ? [attacker, defender] : [defender, attacker];
    }

    getRandomDefenseScore(defender: Player, isDebugMode: boolean, grid: Tile[][]): number {
        let iceDisadvantage = 0;
        const tile = this.gridManagerService.findTileByPlayer(grid, defender);
        if (tile && tile.type === TileType.Ice) {
            iceDisadvantage = ICE_PENALTY;
        }
        const defenseBonus = isDebugMode ? 1 : Math.floor(Math.random() * this.extractDiceValue(defender.defense.bonusDice)) + 1;
        return defender.defense.value + defenseBonus + iceDisadvantage;
    }

    getRandomAttackScore(attacker: Player, isDebugMode: boolean, grid: Tile[][]): number {
        let iceDisadvantage = 0;
        const tile = this.gridManagerService.findTileByPlayer(grid, attacker);
        if (tile && tile.type === TileType.Ice) {
            iceDisadvantage = ICE_PENALTY;
        }
        const diceValue = this.extractDiceValue(attacker.attack.bonusDice);
        const attackBonus = isDebugMode ? diceValue : Math.floor(Math.random() * diceValue) + 1;
        return attacker.attack.value + attackBonus + iceDisadvantage;
    }

    resetLoserPlayerPosition(player: Player, grid: Tile[][]): Tile[][] {
        const defenderSpawnPoint = this.gridManagerService.findTileBySpawnPoint(grid, player);
        const updatedGridAfterTeleportation = this.gridManagerService.teleportPlayer(grid, player, defenderSpawnPoint);
        return updatedGridAfterTeleportation;
    }

    isValidAttacker(combatState: CombatState, attackerName: string): boolean {
        return combatState.currentFighter.name === attackerName;
    }

    getDefender(combatState: CombatState): Player {
        return combatState.currentFighter === combatState.attacker ? combatState.defender : combatState.attacker;
    }

    private extractDiceValue(dice: DiceType): number {
        return parseInt(dice.replace(/\D/g, ''), 10) || 1;
    }
}
