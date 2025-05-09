import { EventEmit } from '@app/enums/enums';
import { GameSession } from '@app/interfaces/game-session';
import { Player } from '@app/interfaces/player';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/statistic';
import { Item } from '@app/model/database/item';
import { Tile } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { GameMode } from '@common/enums';
import { AttackScore } from '@common/interfaces/attack-score';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

const TIME_DIVIDER = 1000;
const MULTIPLIER = 100;
const SECOND_IN_MINUTES = 60;

@Injectable()
export class GameStatisticsService {
    private gameStatistics: Map<string, GameStatistics> = new Map<string, GameStatistics>();
    private visitedTiles: Map<string, Set<string>> = new Map<string, Set<string>>();
    private manipulatedDoors: Map<string, Set<string>> = new Map<string, Set<string>>();
    private flagHolders: Map<string, Set<string>> = new Map<string, Set<string>>();
    private turnCounts: Map<string, number> = new Map<string, number>();

    constructor(private readonly gridManager: GridManagerService) {}

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
        if (!item) return;
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;
        const playerStats = gameStats.playerStats.get(player.name);
        const currentCount = playerStats.uniqueItemsCollected.get(item.name) || 0;
        playerStats.uniqueItemsCollected.set(item.name, currentCount + 1);
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
        return gameStats;
    }

    getGameStatistics(accessCode: string): GameStatistics | undefined {
        return this.gameStatistics.get(accessCode);
    }

    decrementItem(accessCode: string, item: Item, player: Player): void {
        if (!item) return;
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;
        const playerStats = gameStats.playerStats.get(player.name);
        const currentCount = playerStats.uniqueItemsCollected.get(item.name) || 0;
        if (currentCount > 1) {
            playerStats.uniqueItemsCollected.set(item.name, currentCount - 1);
        } else if (currentCount === 1) {
            playerStats.uniqueItemsCollected.delete(item.name);
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
}
