import { Player } from '@app/model/database/player';

export interface CombatState {
    attacker: Player;
    defender: Player;
    currentFighter: Player;
    remainingEscapeAttempts: Map<string, number>;
    combatTurnTimers: NodeJS.Timeout | null;
    combatCountdownInterval: NodeJS.Timeout | null;
    combatTurnTimeRemaining: number;
    pausedGameTurnTimeRemaining?: number;
    winner?: Player;
    playerPerformedAction: boolean;
    isDebugMode: boolean;
}
