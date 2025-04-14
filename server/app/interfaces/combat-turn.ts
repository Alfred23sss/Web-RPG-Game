import { Player } from '@app/interfaces/players';

export interface CombatTurn {
    attacker: Player;
    defender: Player;
    currentFighter: Player;
    combatTurnTimers: NodeJS.Timeout;
    combatCountdownInterval: NodeJS.Timeout;
    combatTurnTimeRemaining: number;
    playerPerformedAction: boolean;
}
