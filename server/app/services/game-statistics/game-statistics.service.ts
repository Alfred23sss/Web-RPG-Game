/* eslint-disable no-unused-vars */
import { EventEmit, GameMode } from '@app/enums/enums';
import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/interfaces/Player';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/Statistic';
import { Item } from '@app/model/database/item';
import { Tile } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from 'eventemitter2';

const SMALL = 10;
const MEDIUM = 15;
const LARGE = 20;
const TIME_DIVIDER = 1000;
const MULTIPLIER = 100;
const SECOND_IN_MINUTE = 60;

@Injectable()
export class GameStatisticsService {
    private gameStatistics: Map<string, GameStatistics> = new Map<string, GameStatistics>();
    private visitedTiles: Map<string, Set<string>> = new Map<string, Set<string>>();
    private manipulatedDoors: Map<string, Set<string>> = new Map<string, Set<string>>();
    private flagHolders: Map<string, Set<string>> = new Map<string, Set<string>>();
    private turnCounts: Map<string, number> = new Map<string, number>();

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly gridManager: GridManagerService,
        private readonly logger: Logger,
    ) {}

    @OnEvent(EventEmit.GameTurnStarted)
    handleTurnStarted(payload: { accessCode: string; player: Player }) {
        const { accessCode } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;
        gameStats.globalStats.totalTurns++;
    }

    @OnEvent(EventEmit.GameCombatStarted)
    handleCombatStarted(payload: { accessCode: string; attacker: Player; defender: Player; currentPlayerName: string }) {
        const { accessCode, attacker, defender } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
        gameStats.playerStats.get(attacker.name).combats++;
        gameStats.playerStats.get(defender.name).combats++;
    }

    @OnEvent(EventEmit.GameCombatEnded)
    handleCombatEnded(payload: { attacker: Player; defender: Player; currentFighter: Player; hasEvaded: boolean; accessCode: string }): void {
        const { attacker, defender, currentFighter, hasEvaded, accessCode } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
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
        attackerScore: number;
        defenseScore: number;
        accessCode: string;
    }) {
        const { currentFighter, defenderPlayer, attackSuccessful, attackerScore, defenseScore } = payload;
        const gameStats = this.gameStatistics.get(payload.accessCode);
        if (attackSuccessful) {
            const finalAttack = attackerScore - defenseScore > 0 ? attackerScore - defenseScore : 0; // double verification jsute pour etre sur que c'est pas negatif
            gameStats.playerStats.get(defenderPlayer.name).healthLost += finalAttack;
            gameStats.playerStats.get(currentFighter.name).damageCaused += finalAttack;
        }
    }

    @OnEvent(EventEmit.GameItemCollected)
    handleItemCollected(payload: { accessCode: string; item: Item; player: Player }) {
        const { accessCode, item, player } = payload;
        const gameStats = this.gameStatistics.get(accessCode);
        if (gameStats.playerStats.get(player.name).uniqueItemsCollected.has(item.name)) {
            // si ya deja on ajoute pas!
            return;
        }
        if (item.name === 'flag') {
            const flagHolderSet = this.flagHolders.get(accessCode);
            flagHolderSet.add(player.name);
        }
        gameStats.playerStats.get(player.name).uniqueItemsCollected.add(item.name);
    }

    @OnEvent(EventEmit.GameTileVisited)
    handleTrackTileVisited(payload: { accessCode: string; player: Player; tile: Tile }): void {
        const { accessCode, tile, player } = payload;
        if (!tile) return;
        const playerKey = `${accessCode}:${player.name}`;
        const visitedTilesSet = this.visitedTiles.get(playerKey);
        visitedTilesSet.add(tile.id);
        // pourcentage update a la fin de la partie pour eviter de toujours le faire a chaque fois.
    }

    @OnEvent(EventEmit.InitializeGameStatistics)
    handleGameStarted(payload: { accessCode: string; players: Player[]; gameSession: GameSession }): void {
        const { accessCode, players, gameSession } = payload;
        const playerStats = new Map<string, PlayerStatistics>();

        players.forEach((player) => {
            const playerKeyTile = `${accessCode}:${player.name}`;

            playerStats.set(player.name, {
                playerName: player.name,
                combats: 0,
                escapes: 0,
                victories: 0,
                defeats: 0,
                healthLost: 0,
                damageCaused: 0,
                uniqueItemsCollected: new Set<string>(),
                tilesVisitedPercentage: 0,
                visitedTileSet: this.visitedTiles.set(playerKeyTile, new Set<string>()),
                hasAbandoned: player.hasAbandoned || false,
            });
        });

        this.logger.log(gameSession.game.size);
        const gridSize = gameSession.game.size as unknown as number;

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
            gridSize: gridSize * gridSize,
            numberOfDoors: this.gridManager.countDoors(gameSession.game.grid),
        };

        this.gameStatistics.set(accessCode, gameStats);
        this.visitedTiles.set(accessCode, new Set<string>());
        this.manipulatedDoors.set(accessCode, new Set<string>());
        this.flagHolders.set(accessCode, new Set<string>());
        this.turnCounts.set(accessCode, 0);
        return;
    }

    @OnEvent(EventEmit.UpdateDoorStats)
    handleDoorManipulated(payload: { accessCode: string; tile: Tile }): void {
        const { accessCode, tile } = payload;
        this.logger.log(`Door manipulated in statisticss: ${tile.id}`);
        if (!tile) return;
        this.manipulatedDoors.get(accessCode).add(tile.id);
    }

    // a split dans plusieurs fonctions
    calculateStats(accessCode: string): GameStatistics {
        const gameStats = this.gameStatistics.get(accessCode);
        if (!gameStats) return;
        gameStats.endTime = new Date();
        const durationInSeconds = Math.floor((gameStats.endTime.getTime() - gameStats.startTime.getTime()) / TIME_DIVIDER);
        gameStats.globalStats.gameDuration = durationInSeconds;
        const minutes = Math.floor(durationInSeconds / SECOND_IN_MINUTE)
            .toString()
            .padStart(2, '0');
        const seconds = (durationInSeconds % SECOND_IN_MINUTE).toString().padStart(2, '0');
        gameStats.globalStats.formattedDuration = `${minutes}:${seconds}`;
        const globalVisitedTiles = this.visitedTiles.get(accessCode)?.size || 0;
        gameStats.globalStats.tilesVisitedPercentage =
            gameStats.gridSize > 0 ? Math.round((globalVisitedTiles / gameStats.gridSize) * MULTIPLIER) : 0;
        const manipulatedDoors = this.manipulatedDoors.get(accessCode)?.size || 0;
        const numberOfDoors = gameStats.numberOfDoors;
        gameStats.globalStats.doorsManipulatedPercentage = numberOfDoors > 0 ? Math.round((manipulatedDoors / numberOfDoors) * MULTIPLIER) : 0;
        gameStats.globalStats.uniqueFlagHolders = this.flagHolders.get(accessCode)?.size || 0;
        for (const [playerName, playerStat] of gameStats.playerStats.entries()) {
            const playerTileKey = `${accessCode}:${playerName}`;
            const visited = this.visitedTiles.get(playerTileKey)?.size || 0;
            playerStat.tilesVisitedPercentage = gameStats.gridSize > 0 ? Math.round((visited / gameStats.gridSize) * MULTIPLIER) : 0;
            gameStats.globalStats.tilesVisitedPercentage = playerStat.tilesVisitedPercentage;
        }
        return gameStats;
    }

    getGameStatistics(accessCode: string): GameStatistics {
        return this.gameStatistics.get(accessCode);
    }

    cleanUp(accessCode: string): void {
        // TODO
        return;
    }

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

        // Log raw map data for debugging
        this.logger.log('\n=== Raw Map Data ===');
        this.logger.log(`Visited Tiles: ${JSON.stringify([...(this.visitedTiles.get(accessCode) || [])])}`);
        this.logger.log(`Manipulated Doors: ${JSON.stringify([...(this.manipulatedDoors.get(accessCode) || [])])}`);
        this.logger.log(`Flag Holders: ${JSON.stringify([...(this.flagHolders.get(accessCode) || [])])}`);
        this.logger.log(`Turn Count: ${this.turnCounts.get(accessCode)}`);
    }
}
