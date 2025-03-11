import { Injectable } from '@nestjs/common';

// const ESCAPE_ATTEMPTS = 2;
// const ESCAPE_CHANCE = 0.3;
// const DEFAULT_TIMER = 5;
// const NO_ESCAPES_TIMER = 3;

// interface CombatState {
//     player1Service: PlayerInfoService;
//     player1Attributes: CombatAttributes;
//     player2Service: PlayerInfoService;
//     player2Attributes: CombatAttributes;
//     currentPlayerService: PlayerInfoService;
//     isCombatActive: boolean;
// }

// interface CombatAttributes {
//     turnTime: number;
//     escapeAttempts: number;
// }

@Injectable()
export class CombatManagerService {
    //     // private combatState!: CombatState;
    //     // startCombat(player1Service: PlayerInfoService, player2Service: PlayerInfoService): void {
    //     //     const player1 = player1Service.getPlayerSnapshot();
    //     //     const player2 = player2Service.getPlayerSnapshot();
    //     //     this.combatState = {
    //     //         player1Service,
    //     //         player1Attributes: { turnTime: DEFAULT_TIMER, escapeAttempts: ESCAPE_ATTEMPTS },
    //     //         player2Service,
    //     //         player2Attributes: { turnTime: DEFAULT_TIMER, escapeAttempts: ESCAPE_ATTEMPTS },
    //     //         currentPlayerService: player1.speed >= player2.speed ? player1Service : player2Service,
    //     //         isCombatActive: true,
    //     //     };
    //     // }
    //     // handleAttack(): void {
    //     //     const attackerService = this.combatState.currentPlayerService;
    //     //     const attacker = attackerService.getPlayerSnapshot();
    //     //     const defenderService =
    //     //         attackerService === this.combatState.player1Service ? this.combatState.player2Service : this.combatState.player1Service;
    //     //     const defender = defenderService.getPlayerSnapshot();
    //     //     const attackValue = attacker.attack.value + this.rollDice(attacker.attack.bonusDice);
    //     //     const defenseValue = defender.defense.value + this.rollDice(defender.defense.bonusDice);
    //     //     const damage = Math.max(0, attackValue - defenseValue);
    //     //     defenderService.updateHealth(-damage);
    //     //     this.switchTurn();
    //     // }
    //     // handleEvasion(): void {
    //     //     const currentAttributes = this.getCurrentAttributes();
    //     //     if (currentAttributes.escapeAttempts <= 0) return;
    //     //     if (Math.random() < ESCAPE_CHANCE) {
    //     //         this.combatState.player1Service.restoreHealth();
    //     //         this.combatState.player2Service.restoreHealth();
    //     //         this.combatState.isCombatActive = false;
    //     //     } else {
    //     //         currentAttributes.escapeAttempts--;
    //     //     }
    //     //     if (currentAttributes.escapeAttempts === 0) {
    //     //         currentAttributes.turnTime = NO_ESCAPES_TIMER;
    //     //     }
    //     //     this.switchTurn();
    //     // }
    //     // private rollDice(bonusDice: DiceType): number {
    //     //     return Math.ceil(Math.random() * parseInt(bonusDice.slice(1), 10));
    //     // }
    //     // private switchTurn(): void {
    //     //     this.combatState.currentPlayerService =
    //     //         this.combatState.currentPlayerService === this.combatState.player1Service
    //     //             ? this.combatState.player2Service
    //     //             : this.combatState.player1Service;
    //     // }
    //     // private getCurrentAttributes(): CombatAttributes {
    //     //     return this.combatState.currentPlayerService === this.combatState.player1Service
    //     //         ? this.combatState.player1Attributes
    //     //         : this.combatState.player2Attributes;
    //     // }
}
