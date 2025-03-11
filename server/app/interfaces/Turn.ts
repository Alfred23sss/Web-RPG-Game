import { Player } from './Player';

export interface Turn {
    orderedPlayers: Player[];
    currentPlayer: Player | null;
    currentTurnCountdown: number;
    turnTimers: NodeJS.Timeout | null; // For setTimeout
    countdownInterval: NodeJS.Timeout | null; // For setInterval
    isTransitionPhase: boolean;
    transitionTimeRemaining?: number;
}
