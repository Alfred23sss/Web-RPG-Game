import { Player } from './players';

export interface Turn {
    orderedPlayers: Player[];
    currentPlayer: Player | null;
    currentTurnCountdown: number;
    turnTimers: NodeJS.Timeout | null;
    countdownInterval: NodeJS.Timeout | null;
    isTransitionPhase: boolean;
    isInCombat: boolean;
    transitionTimeRemaining?: number;
    beginnerPlayer: Player;
}
