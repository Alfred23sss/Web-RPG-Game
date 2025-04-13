import { GameMode } from '@app/enums/enums';

export interface GameStatistics {
    accessCode: string;
    playerStats: Map<string, PlayerStatistics>;
    globalStats: GlobalStatistics;
    startTime: Date;
    endTime?: Date;
    gameMode: GameMode;
    gridSize: number;
    numberOfDoors: number;
}

export interface PlayerStatistics {
    playerName: string;
    combats: number;
    escapes: number;
    victories: number;
    defeats: number;
    healthLost: number;
    damageCaused: number;
    uniqueItemsCollected: Map<string, number>;
    tilesVisitedPercentage: number;
    visitedTileSet: Map<string, Set<string>>;
    hasAbandoned: boolean;
}

export interface GlobalStatistics {
    gameDuration: number;
    totalTurns: number;
    tilesVisitedPercentage: number;
    doorsManipulatedPercentage: number;
    uniqueFlagHolders?: number;
    formattedDuration?: string;
}

export interface StatisticsSortConfig {
    column: string;
    ascending: boolean;
}
