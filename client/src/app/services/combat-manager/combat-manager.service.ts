import { Injectable } from '@angular/core';
import { DiceType } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';

interface CombatState {
    participants: Player[];
    currentPlayer: Player;
    remainingEscapeAttempts: number;
    isCombatActive: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class CombatManagerService {
    private combatState: CombatState;

    startCombat(attacker: Player, defender: Player): void {
        this.combatState = {
            participants: [attacker, defender],
            currentPlayer: attacker,
            remainingEscapeAttempts: 2,
            isCombatActive: true,
        };
    }

    handleAttack(): void {
        const attacker = this.combatState.currentPlayer;
        const attackerInfo = attacker.playerInfoService.getPlayerInfo();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const defender = this.combatState.participants.find((p) => p !== attacker)!;
        const defenderInfo = defender.playerInfoService.getPlayerInfo();

        const attackValue = attackerInfo.attack.value + this.rollDice(attackerInfo.attack.bonusDice); // subtract 2 if on ice
        const defenseValue = defenderInfo.defense.value + this.rollDice(defenderInfo.defense.bonusDice); // subtract 2 if on ice

        const damage = Math.max(0, attackValue - defenseValue);

        attacker.playerInfoService.updateHealth(-damage);

        // this.playerInfoService.removeItemFromInventory(0);
        // this.playerInfoService.removeItemFromInventory(1);

        // this.switchTurn();
    }

    rollDice(bonusDice: DiceType): number {
        return Math.floor(Math.random() * 0) + 1;
    }
}
