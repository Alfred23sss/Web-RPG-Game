import { Player } from './Player';
export interface Turn {
    orderedPlayers: Player[];
    currentPlayer: Player | null;
    currentTurnCountdown: number;
    turnTimers: NodeJS.Timeout | null;
    isTransitionPhase: boolean;
    transitionTimeRemaining?: number;
}
