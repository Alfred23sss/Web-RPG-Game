import { EventEmit } from '@app/enums/enums';
import { GameSession } from '@app/interfaces/game-session';
import { Turn } from '@app/interfaces/turn';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { Item } from '@app/model/database/item';
import { Player } from '@app/model/database/player';
import { Tile } from '@app/model/database/tile';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { ItemEffectsService } from '@app/services/item-effects/item-effects.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { GameMode, ItemName, TileType } from '@common/enums';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const PLAYER_MOVE_DELAY = 150;

@Injectable()
export class GameSessionService {
    private gameSessions: Map<string, GameSession> = new Map<string, GameSession>();

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly lobbyService: LobbyService,
        private readonly gridManager: GridManagerService,
        private readonly turnService: GameSessionTurnService,
        private readonly itemEffectsService: ItemEffectsService,
    ) {
        this.eventEmitter.on(EventEmit.GameTurnTimeout, ({ accessCode }) => {
            this.endTurn(accessCode);
        });
    }

    endTurn(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        this.turnService.endTurn(gameSession.turn);
        this.startTransitionPhase(accessCode);
    }

    async updatePlayerPosition(accessCode: string, movement: Tile[], player: Player): Promise<void> {
        const gameSession = this.gameSessions.get(accessCode);
        let isCurrentlyMoving = true;

        for (let i = 1; i < movement.length; i++) {
            await this.delayMove();
            this.updatePlayerLocation(gameSession, movement[i], player);
            this.emitTileVisitedEvent(accessCode, player, movement[i]);
            this.handleIceShieldItems(player, movement[i]);

            isCurrentlyMoving = this.updateMovementStatus(i, movement);

            if (!isCurrentlyMoving && this.shouldCollectItem(movement[i])) {
                this.collectItem(accessCode, player, movement[i]);
                break;
            }

            this.emitMovementEvent(accessCode, gameSession, player, isCurrentlyMoving);

            if (this.gridManager.isFlagOnSpawnPoint(gameSession.game.grid, player)) {
                this.handleWinCondition(accessCode, player, gameSession);
            }
        }
    }

    updateDoorTile(accessCode: string, previousTile: Tile, newTile: Tile, player: VirtualPlayer): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        gameSession.game.grid = this.gridManager.updateDoorTile(gameSession.game.grid, accessCode, previousTile, newTile, player);
    }

    callTeleport(accessCode: string, player: Player, targetTile: Tile): void {
        const updatedGrid = this.gridManager.teleportPlayer(this.getGameSession(accessCode).game.grid, player, targetTile);
        this.getGameSession(accessCode).game.grid = updatedGrid;
        this.emitGridUpdate(accessCode, updatedGrid);
    }

    handleItemDropped(accessCode: string, player: Player, item: Item): void {
        const { name, player: updatedPlayer } = this.itemEffectsService.handleItemDropped(
            player,
            item,
            this.getGameSession(accessCode).game.grid,
            accessCode,
        );
        this.updateGameSessionPlayerList(accessCode, name, updatedPlayer);
    }

    updateGameSessionPlayerList(accessCode: string, playerName: string, updates: Partial<Player>): void {
        const players = this.getPlayers(accessCode);
        const player = players.find((p) => p.name === playerName);
        this.updatePlayer(player, updates);
        this.emitEvent(EventEmit.UpdatePlayerList, { players: this.getPlayers(accessCode), accessCode });
    }

    getPlayers(accessCode: string): Player[] {
        const gameSession = this.gameSessions.get(accessCode);
        return gameSession ? gameSession.turn.orderedPlayers : [];
    }

    endGameSession(accessCode: string, winner: string[]) {
        this.emitEvent(EventEmit.GameEnded, { accessCode, winner });
    }

    resumeGameTurn(accessCode: string, remainingTime: number): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        this.turnService.resumeTurn(accessCode, gameSession.turn, remainingTime);
    }

    getGameSession(accessCode: string): GameSession {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        return gameSession;
    }

    setCombatState(accessCode: string, isInCombat: boolean): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (gameSession) {
            gameSession.turn.isInCombat = isInCombat;
        }
    }

    isCurrentPlayer(accessCode: string, playerName: string): boolean {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession || !gameSession.turn.currentPlayer) return false;
        const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
        return gameSession.turn.beginnerPlayer.name === playerName && !player?.hasAbandoned;
    }

    pauseGameTurn(accessCode: string): number {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return 0;

        return this.turnService.pauseTurn(gameSession.turn);
    }

    updateWallTile(accessCode: string, previousTile: Tile, newTile: Tile, player: Player): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        const [updatedGrid, updatedPlayer] = this.gridManager.updateWallTile(gameSession.game.grid, accessCode, previousTile, newTile, player);
        gameSession.game.grid = updatedGrid;
        this.updateGameSessionPlayerList(accessCode, updatedPlayer.name, updatedPlayer);
    }

    handlePlayerItemReset(accessCode: string, player: Player): void {
        const gameSession = this.getGameSession(accessCode);
        const grid = gameSession.game.grid;
        const { name, player: updatedPlayer } = this.itemEffectsService.handlePlayerItemReset(player, grid, accessCode);
        this.updateGameSessionPlayerList(accessCode, name, updatedPlayer);
    }

    emitGridUpdate(accessCode: string, grid: Tile[][]): void {
        this.eventEmitter.emit(EventEmit.GameGridUpdate, {
            accessCode,
            grid,
        });
    }

    createGameSession(accessCode: string, gameMode: string): GameSession {
        const lobby = this.lobbyService.getLobby(accessCode);
        const game = lobby.game;
        const grid = this.gridManager.assignItemsToRandomItems(game.grid);
        const spawnPoints = this.gridManager.findSpawnPoints(grid);
        let turn: Turn;
        if (gameMode === GameMode.CTF) {
            turn = this.turnService.initializeTurnCTF(accessCode);
        } else {
            turn = this.turnService.initializeTurn(accessCode);
        }
        const [players, updatedGrid] = this.gridManager.assignPlayersToSpawnPoints(turn.orderedPlayers, spawnPoints, grid);
        game.grid = updatedGrid;
        game.mode = gameMode;
        const gameSession: GameSession = { game, turn };
        this.gameSessions.set(accessCode, gameSession);
        this.updatePlayerListSpawnPoint(players, accessCode);
        this.emitEvent(EventEmit.InitializeGameStatistics, { accessCode, players: gameSession.turn.orderedPlayers, gameSession });
        this.startTransitionPhase(accessCode);
        return gameSession;
    }

    deleteGameSession(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (gameSession) {
            if (gameSession.turn.turnTimers) {
                clearTimeout(gameSession.turn.turnTimers);
            }
            if (gameSession.turn.countdownInterval) {
                clearInterval(gameSession.turn.countdownInterval);
            }
            this.gameSessions.delete(accessCode);
        }
    }

    isPlayerInGame(accessCode: string, playerName: string): boolean {
        const session = this.getGameSession(accessCode);
        if (!session) return false;
        return session.turn.orderedPlayers.some((player) => player.name === playerName);
    }

    handlePlayerAbandoned(accessCode: string, playerName: string): Player | null {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return null;
        const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
        if (player) {
            const spawnTileId = player.spawnPoint?.tileId;
            this.updatePlayer(player, { hasAbandoned: true });
            if (spawnTileId) {
                const spawnTile = this.gridManager.findTileById(gameSession.game.grid, spawnTileId);
                if (spawnTile) {
                    spawnTile.item = undefined;
                }
            }
            this.gridManager.clearPlayerFromGrid(gameSession.game.grid, playerName);
            this.emitGridUpdate(accessCode, gameSession.game.grid);
        }
        if (gameSession.turn.currentPlayer.name === playerName) {
            this.endTurn(accessCode);
        }
        if (player.isAdmin) {
            this.eventEmitter.emit(EventEmit.AdminModeDisabled, { accessCode });
        }
        return player;
    }

    private async delayMove(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, PLAYER_MOVE_DELAY));
    }

    private updatePlayerLocation(gameSession: GameSession, tile: Tile, player: Player): void {
        this.gridManager.clearPlayerFromGrid(gameSession.game.grid, player.name);
        this.gridManager.setPlayerOnTile(gameSession.game.grid, tile, player);
    }

    private emitTileVisitedEvent(accessCode: string, player: Player, tile: Tile): void {
        this.eventEmitter.emit(EventEmit.GameTileVisited, {
            accessCode,
            player,
            tile,
        });
    }

    private handleIceShieldItems(player: Player, tile: Tile): void {
        player.inventory.forEach((item, index) => {
            if (item?.name === ItemName.IceShield) {
                if (tile.type === TileType.Ice) {
                    this.itemEffectsService.addEffect(player, item, tile);
                } else {
                    this.itemEffectsService.removeEffects(player, index);
                }
            }
        });
    }

    private updateMovementStatus(currentIndex: number, movement: Tile[]): boolean {
        if (currentIndex === movement.length - 1) {
            return false;
        }

        const currentTile = movement[currentIndex];
        if (currentTile.item && currentTile.item !== undefined) {
            if (currentTile.item.name !== ItemName.Home) {
                return false;
            }
        }

        return true;
    }

    private shouldCollectItem(tile: Tile): boolean {
        return tile.item !== undefined && tile.item && tile.item.name !== ItemName.Home;
    }

    private collectItem(accessCode: string, player: Player, tile: Tile): void {
        this.addItemToPlayer(accessCode, player, tile.item, this.getGameSession(accessCode));
        this.emitEvent(EventEmit.GameItemCollected, {
            accessCode,
            item: tile.item,
            player,
        });
    }

    private emitMovementEvent(accessCode: string, gameSession: GameSession, player: Player, isCurrentlyMoving: boolean): void {
        this.eventEmitter.emit(EventEmit.GamePlayerMovement, {
            accessCode,
            grid: gameSession.game.grid,
            player,
            isCurrentlyMoving,
        });
    }

    private handleWinCondition(accessCode: string, player: Player, gameSession: GameSession): void {
        const sameTeamPlayers: string[] = [];

        for (const playerOfList of gameSession.turn.orderedPlayers) {
            if (playerOfList.team === player.team) {
                sameTeamPlayers.push(playerOfList.name);
            }
        }

        this.endGameSession(accessCode, sameTeamPlayers);
    }

    private startTransitionPhase(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        this.turnService.startTransitionPhase(accessCode, gameSession.turn);
    }

    private updatePlayer(player: Player, updates: Partial<Player>): void {
        this.turnService.updatePlayer(player, updates);
    }

    private updatePlayerListSpawnPoint(players: Player[], accessCode: string): void {
        const gameSession = this.getGameSession(accessCode);
        for (const playerUpdated of players) {
            if (playerUpdated.spawnPoint) {
                const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerUpdated.name);
                if (player) {
                    this.updatePlayer(player, playerUpdated);
                }
            }
        }
    }

    private addItemToPlayer(accessCode: string, player: Player, item: Item, gameSession: GameSession): void {
        const grid = gameSession.game.grid;
        const { player: updatedPlayer, items } = this.itemEffectsService.addItemToPlayer(player, item, grid, accessCode);
        if (!items) {
            this.updateGameSessionPlayerList(accessCode, updatedPlayer.name, { ...updatedPlayer });
        }
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
