import { Player } from './Player';

export interface Turn {
    currentPlayer: Player | undefined;
    players: Player[] | undefined;
    turnTimers?: NodeJS.Timeout | null;
    currentTurnCountdown: number;
    isTransitionPhase?: boolean;
}
