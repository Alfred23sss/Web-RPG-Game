import { EventEmit, GameMode } from '@app/enums/enums';
import { AttackScore } from '@app/interfaces/AttackScore';
import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/interfaces/Player';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/Statistic';
import { Item } from '@app/model/database/item';
import { Tile } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

// bouge ca dans constant global et trouver meilleur nom
const TIME_DIVIDER = 1000;
const MULTIPLIER = 100;
const SECOND_IN_MINUTES = 60;

@Injectable()
export class GameStatisticsService {
    private gameStatistics: Map<string, GameStatistics> = new Map<string, GameStatistics>();
    private visitedTiles: Map<string, Set<string>> = new Map<string, Set<string>>();
    private manipulatedDoors: Map<string, Set<string>> = new Map<string, Set<string>>();
    private flagHolders: Map<string, Set<string>> = new Map<string, Set<string>>();
    // surement a enlever (a voir)
    private turnCounts: Map<string, number> = new Map<string, number>();

    constructor(
        private readonly gridManager: GridManagerService,
        private readonly logger: Logger,
    ) {}

    @OnEvent(EventEmit.GameTurnStarted)
    handleTurnStarted(payload: { accessCode: string; player: Player }): void {
        const { accessCode } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;
        gameStats.globalStats.totalTurns++;
    }

    @OnEvent(EventEmit.GameCombatStarted)
    handleCombatStarted(payload: { accessCode: string; attacker: Player; defender: Player; currentPlayerName: string }): void {
        const { accessCode, attacker, defender } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;

        gameStats.playerStats.get(attacker.name).combats++;
        gameStats.playerStats.get(defender.name).combats++;
    }

    @OnEvent(EventEmit.GameCombatEnded)
    handleCombatEnded(payload: { attacker: Player; defender: Player; currentFighter: Player; hasEvaded: boolean; accessCode: string }): void {
        const { attacker, defender, currentFighter, hasEvaded, accessCode } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;

        if (hasEvaded) {
            gameStats.playerStats.get(currentFighter.name).escapes++;
        } else {
            const loser = currentFighter.name === attacker.name ? defender : attacker;
            gameStats.playerStats.get(currentFighter.name).victories++;
            gameStats.playerStats.get(loser.name).defeats++;
        }
    }

    @OnEvent(EventEmit.GameCombatAttackResult)
    handleCombatResult(payload: {
        currentFighter: Player;
        defenderPlayer: Player;
        attackSuccessful: boolean;
        attackerScore: AttackScore;
        defenseScore: AttackScore;
        accessCode: string;
    }): void {
        const { currentFighter, defenderPlayer, attackSuccessful, attackerScore, defenseScore, accessCode } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats || !attackSuccessful) return;

        const finalAttack = Math.max(0, attackerScore.score - defenseScore.score);
        gameStats.playerStats.get(defenderPlayer.name).healthLost += finalAttack;
        gameStats.playerStats.get(currentFighter.name).damageCaused += finalAttack;
    }

    @OnEvent(EventEmit.GameItemCollected)
    handleItemCollected(payload: { accessCode: string; item: Item; player: Player }): void {
        const { accessCode, item, player } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;
        const playerStats = gameStats.playerStats.get(player.name);
        const currentCount = playerStats.uniqueItemsCollected.get(item.name) || 0;
        playerStats.uniqueItemsCollected.set(item.name, currentCount + 1);
        Logger.log(`Item ${item.name} added to player ${player.name} in statistics.`);
        if (item.name === 'flag') {
            const flagHolderSet = this.flagHolders.get(accessCode);
            if (flagHolderSet) {
                flagHolderSet.add(player.name);
            }
        }
    }

    @OnEvent(EventEmit.GameTileVisited)
    handleTrackTileVisited(payload: { accessCode: string; player: Player; tile: Tile }): void {
        const { accessCode, tile, player } = payload;
        if (!tile) return;

        const playerKey = this.getPlayerKey(accessCode, player.name);
        const visitedTilesSet = this.visitedTiles.get(playerKey);
        if (visitedTilesSet) {
            visitedTilesSet.add(tile.id);
        }
    }

    @OnEvent(EventEmit.InitializeGameStatistics)
    handleGameStarted(payload: { accessCode: string; players: Player[]; gameSession: GameSession }): void {
        const { accessCode, players, gameSession } = payload;

        const playerStats = this.initializePlayerStats(accessCode, players);
        const gridSize = gameSession.game.size as unknown as number;
        const totalGridSize = gridSize * gridSize;

        const gameStats: GameStatistics = {
            accessCode,
            playerStats,
            globalStats: {
                gameDuration: 0,
                totalTurns: 0,
                tilesVisitedPercentage: 0,
                doorsManipulatedPercentage: 0,
                uniqueFlagHolders: 0,
            },
            startTime: new Date(),
            gameMode: gameSession.game.mode as GameMode,
            gridSize: totalGridSize,
            numberOfDoors: this.gridManager.countDoors(gameSession.game.grid),
        };

        this.gameStatistics.set(accessCode, gameStats);
        this.visitedTiles.set(accessCode, new Set<string>());
        this.manipulatedDoors.set(accessCode, new Set<string>());
        this.flagHolders.set(accessCode, new Set<string>());
        this.turnCounts.set(accessCode, 0);
    }

    @OnEvent(EventEmit.UpdateDoorStats)
    handleDoorManipulated(payload: { accessCode: string; tile: Tile }): void {
        const { accessCode, tile } = payload;
        if (!tile) return;

        const doorSet = this.manipulatedDoors.get(accessCode);
        if (doorSet) {
            this.logger.log(`Door manipulated in statistics: ${tile.id}`);
            doorSet.add(tile.id);
        }
    }

    calculateStats(accessCode: string): GameStatistics | undefined {
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return undefined;

        gameStats.endTime = new Date();

        this.calculateGameDuration(gameStats);
        this.calculateGlobalTileVisitedPercentage(accessCode, gameStats);
        this.calculateDoorsManipulatedPercentage(accessCode, gameStats);
        this.calculateFlagHolders(accessCode, gameStats);
        this.calculatePlayerTileVisitedPercentages(accessCode, gameStats);

        this.logStatistics(accessCode, gameStats);
        return gameStats;
    }

    getGameStatistics(accessCode: string): GameStatistics | undefined {
        return this.gameStatistics.get(accessCode);
    }

    decrementItem(accessCode: string, item: Item, player: Player): void {
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;
        const playerStats = gameStats.playerStats.get(player.name);
        const currentCount = playerStats.uniqueItemsCollected.get(item.name) || 0;
        if (currentCount > 1) {
            playerStats.uniqueItemsCollected.set(item.name, currentCount - 1);
        } else if (currentCount === 1) {
            playerStats.uniqueItemsCollected.delete(item.name);
            Logger.log(`Item ${item.name} removed from player ${player.name} in statistics.`);
        }
    }

    cleanUp(accessCode: string): void {
        this.gameStatistics.delete(accessCode);
        this.visitedTiles.forEach((_, key) => {
            if (key.startsWith(`${accessCode}:`)) {
                this.visitedTiles.delete(key);
            }
        });
        this.manipulatedDoors.delete(accessCode);
        this.flagHolders.delete(accessCode);
        this.turnCounts.delete(accessCode);

        this.logger.log(`Cleaned up statistics for game: ${accessCode}`);
    }

    private getPlayerKey(accessCode: string, playerName: string): string {
        return `${accessCode}:${playerName}`;
    }

    private initializePlayerStats(accessCode: string, players: Player[]): Map<string, PlayerStatistics> {
        const playerStats = new Map<string, PlayerStatistics>();

        players.forEach((player) => {
            const playerKey = this.getPlayerKey(accessCode, player.name);
            const visitedTileSet = new Set<string>();
            this.visitedTiles.set(playerKey, visitedTileSet);
            const visitedTileMap = new Map<string, Set<string>>();
            visitedTileMap.set(playerKey, visitedTileSet);
            playerStats.set(player.name, {
                playerName: player.name,
                combats: 0,
                escapes: 0,
                victories: 0,
                defeats: 0,
                healthLost: 0,
                damageCaused: 0,
                uniqueItemsCollected: new Map<string, number>(),
                tilesVisitedPercentage: 0,
                visitedTileSet: visitedTileMap,
                hasAbandoned: player.hasAbandoned || false,
            });
        });
        return playerStats;
    }

    private calculateGameDuration(gameStats: GameStatistics): void {
        const durationInSeconds = Math.floor((gameStats.endTime.getTime() - gameStats.startTime.getTime()) / TIME_DIVIDER);
        gameStats.globalStats.gameDuration = durationInSeconds;

        const minutes = Math.floor(durationInSeconds / SECOND_IN_MINUTES)
            .toString()
            .padStart(2, '0');
        const seconds = (durationInSeconds % SECOND_IN_MINUTES).toString().padStart(2, '0');

        gameStats.globalStats.formattedDuration = `${minutes}:${seconds}`;
    }

    private calculateGlobalTileVisitedPercentage(accessCode: string, gameStats: GameStatistics): void {
        const globalVisitedTiles = this.visitedTiles.get(accessCode)?.size || 0;
        gameStats.globalStats.tilesVisitedPercentage = this.calculatePercentage(globalVisitedTiles, gameStats.gridSize);
    }

    private calculateDoorsManipulatedPercentage(accessCode: string, gameStats: GameStatistics): void {
        const manipulatedDoors = this.manipulatedDoors.get(accessCode)?.size || 0;
        gameStats.globalStats.doorsManipulatedPercentage = this.calculatePercentage(manipulatedDoors, gameStats.numberOfDoors);
    }

    private calculateFlagHolders(accessCode: string, gameStats: GameStatistics): void {
        gameStats.globalStats.uniqueFlagHolders = this.flagHolders.get(accessCode)?.size || 0;
    }

    private calculatePlayerTileVisitedPercentages(accessCode: string, gameStats: GameStatistics): void {
        let maxTileVisitedPercentage = 0;
        for (const [playerName, playerStat] of gameStats.playerStats.entries()) {
            const playerKey = this.getPlayerKey(accessCode, playerName);
            const visitedTiles = this.visitedTiles.get(playerKey)?.size || 0;
            const percentage = this.calculatePercentage(visitedTiles, gameStats.gridSize);
            playerStat.tilesVisitedPercentage = percentage;
            maxTileVisitedPercentage = Math.max(maxTileVisitedPercentage, percentage);
        }
        gameStats.globalStats.tilesVisitedPercentage = maxTileVisitedPercentage;
    }

    private calculatePercentage(value: number, total: number): number {
        return total > 0 ? Math.round((value / total) * MULTIPLIER) : 0;
    }

    // to remove after no need to test, only useful for debugging
    private logStatistics(accessCode: string, gameStats: GameStatistics): void {
        this.logger.log('=== Game Statistics ===');
        this.logger.log(`Game Access Code: ${accessCode}`);
        this.logger.log(`Game Mode: ${gameStats.gameMode}`);
        this.logger.log(`Grid Size: ${gameStats.gridSize}`);
        this.logger.log(`Number of Doors: ${gameStats.numberOfDoors}`);
        this.logger.log(`Duration: ${gameStats.globalStats.formattedDuration}`);
        this.logger.log(`Total Turns: ${gameStats.globalStats.totalTurns}`);
        this.logger.log(`Global Visited Tiles: ${gameStats.globalStats.tilesVisitedPercentage}%`);
        this.logger.log(`Doors Manipulated: ${gameStats.globalStats.doorsManipulatedPercentage}%`);
        this.logger.log(`Unique Flag Holders: ${gameStats.globalStats.uniqueFlagHolders}`);

        this.logger.log('\n=== Player Statistics ===');
        gameStats.playerStats.forEach((playerStat, playerName) => {
            this.logger.log(`\nPlayer: ${playerName}`);
            this.logger.log(`- Combats: ${playerStat.combats}`);
            this.logger.log(`- Escapes: ${playerStat.escapes}`);
            this.logger.log(`- Victories: ${playerStat.victories}`);
            this.logger.log(`- Defeats: ${playerStat.defeats}`);
            this.logger.log(`- Health Lost: ${playerStat.healthLost}`);
            this.logger.log(`- Damage Caused: ${playerStat.damageCaused}`);
            this.logger.log(`- Unique Items Collected: ${playerStat.uniqueItemsCollected.size}`);
            this.logger.log(`- Tiles Visited: ${playerStat.tilesVisitedPercentage}%`);
            this.logger.log(`- Has Abandoned: ${playerStat.hasAbandoned}`);
        });

        this.logger.log('\n=== Raw Map Data ===');
        this.logger.log(`Visited Tiles: ${JSON.stringify([...(this.visitedTiles.get(accessCode) || [])])}`);
        this.logger.log(`Manipulated Doors: ${JSON.stringify([...(this.manipulatedDoors.get(accessCode) || [])])}`);
        this.logger.log(`Flag Holders: ${JSON.stringify([...(this.flagHolders.get(accessCode) || [])])}`);
        this.logger.log(`Turn Count: ${this.turnCounts.get(accessCode)}`);
    }
}
