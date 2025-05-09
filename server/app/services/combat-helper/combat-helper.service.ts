import { AttackScore } from '@common/interfaces/attack-score';
import { CombatState } from '@app/interfaces/combat-state';
import { DiceType } from '@app/interfaces/dice';
import { Player } from '@app/model/database/player';
import { Tile } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { ItemName, TileType } from '@common/enums';
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

    getRandomDefenseScore(defender: Player, isDebugMode: boolean, grid: Tile[][]): AttackScore {
        let iceDisadvantage = 0;
        const tile = this.gridManagerService.findTileByPlayer(grid, defender);
        if (tile && tile.type === TileType.Ice) {
            iceDisadvantage = ICE_PENALTY;
        }
        const diceValue = this.hasGreatShieldItem(defender) ? this.extractDiceValue(DiceType.D6) : this.extractDiceValue(defender.defense.bonusDice);
        const diceRolled = Math.floor(Math.random() * diceValue);
        const defenseBonus = isDebugMode ? diceValue : diceRolled + 1;
        const score = defender.defense.value + defenseBonus + iceDisadvantage;
        return { score, diceRolled };
    }

    getRandomAttackScore(attacker: Player, isDebugMode: boolean, grid: Tile[][]): AttackScore {
        let iceDisadvantage = 0;
        const tile = this.gridManagerService.findTileByPlayer(grid, attacker);
        if (tile && tile.type === TileType.Ice) {
            iceDisadvantage = ICE_PENALTY;
        }
        const diceValue = this.hasGreatShieldItem(attacker) ? this.extractDiceValue(DiceType.D6) : this.extractDiceValue(attacker.attack.bonusDice);
        const diceRolled = Math.floor(Math.random() * diceValue);
        const attackBonus = isDebugMode ? diceValue : diceRolled + 1;
        const score = attacker.attack.value + attackBonus + iceDisadvantage;
        return { score, diceRolled };
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

    private hasGreatShieldItem(player: Player): boolean {
        return Array.isArray(player.inventory) && player.inventory.some((item) => item?.name === ItemName.GreatShield);
    }
}
