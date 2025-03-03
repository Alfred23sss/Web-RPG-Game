import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
import { DiceType } from '@app/enums/global.enums';
import { DiceModifier } from '@app/interfaces/item-attributes';
import { Player } from '@app/interfaces/player';

const ESCAPE_ATTEMPTS = 2;
const ESCAPE_CHANCE = 0.3;
const DEFAULT_TIMER = 5;
const NO_ESCAPES_TIMER = 3;

interface CombatState {
    player1: Player;
    player1Attributes: CombatAttributes;
    player2: Player;
    player2Attributes: CombatAttributes;
    currentPlayer: Player;
    isCombatActive: boolean;
}

interface CombatAttributes {
    turnTime: number;
    escapeAttempts: number;
}

@Injectable({
    providedIn: 'root',
})
export class CombatManagerService {
    private combatState: CombatState;

    startCombat(player1: Player, player2: Player): void {
        this.combatState = {
            player1,
            player1Attributes: { turnTime: DEFAULT_TIMER, escapeAttempts: ESCAPE_ATTEMPTS },
            player2,
            player2Attributes: { turnTime: DEFAULT_TIMER, escapeAttempts: ESCAPE_ATTEMPTS },
            currentPlayer: player1.playerInfoService.getPlayerInfo().speed >= player2.playerInfoService.getPlayerInfo().speed ? player1 : player2,
            isCombatActive: true,
        };
    }

    handleAttack(): void {
        const attacker = this.combatState.currentPlayer;
        const attackerInfo = attacker.playerInfoService.getPlayerInfo();
        const defender = attacker === this.combatState.player1 ? this.combatState.player2 : this.combatState.player1;
        const defenderInfo = defender.playerInfoService.getPlayerInfo();

        const attackValue = attackerInfo.attack.value + this.rollDice(attackerInfo.attack.bonusDice, attacker);
        const defenseValue = defenderInfo.defense.value + this.rollDice(defenderInfo.defense.bonusDice, defender);
        const damage = Math.max(0, attackValue - defenseValue);

        defender.playerInfoService.updateHealth(-damage);

        this.switchTurn();
    }

    handleEvasion(): void {
        const currentAttributes = this.getCurrentAttributes();
        if (currentAttributes.escapeAttempts <= 0) return; // Tell player he has no more escape attempts

        if (Math.random() < ESCAPE_CHANCE) {
            this.combatState.player1.playerInfoService.restoreHealth();
            this.combatState.player2.playerInfoService.restoreHealth();
            this.combatState.isCombatActive = false;
        } else {
            currentAttributes.escapeAttempts--;
        }
        if (currentAttributes.escapeAttempts === 0) {
            currentAttributes.turnTime = NO_ESCAPES_TIMER;
        }
        this.switchTurn();
    }

    private rollDice(diceType: DiceType, player: Player): number {
        const diceValue = parseInt(diceType.slice(1), 10);

        const modifiers = player.playerInfoService
            .getPlayerInfo()
            .inventory.filter((item): item is Item => !!item?.diceModifiers)
            .flatMap((item) => item.diceModifiers)
            .filter((mod): mod is DiceModifier => !!mod && mod.diceType === diceType);

        let min = 1;
        let max = diceValue;

        modifiers.forEach((mod) => {
            min = Math.max(min, mod.min);
            max = Math.min(max, mod.max);
        });

        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private switchTurn(): void {
        const { player1, player2, currentPlayer } = this.combatState;
        this.combatState.currentPlayer = currentPlayer === player1 ? player2 : player1;
    }

    private getCurrentAttributes(): CombatAttributes {
        return this.combatState.currentPlayer === this.combatState.player1 ? this.combatState.player1Attributes : this.combatState.player2Attributes;
    }
}
