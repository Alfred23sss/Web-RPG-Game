import { Player } from './Player';

export interface Turn {
    currentPlayer: Player | undefined;
    orderedPlayers: Player[] | undefined;
    turnTimers?: NodeJS.Timeout | null;
    currentTurnCountdown: number;
    isTransitionPhase?: boolean;
}
