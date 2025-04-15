import { Player } from '@app/interfaces/player';

export interface CombatTurn {
    attacker: Player;
    defender: Player;
    currentFighter: Player;
    combatTurnTimers: NodeJS.Timeout;
    combatCountdownInterval: NodeJS.Timeout;
    combatTurnTimeRemaining: number;
    playerPerformedAction: boolean;
}
