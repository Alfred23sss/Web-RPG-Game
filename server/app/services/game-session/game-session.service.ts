import { EventEmit, GameMode, ItemName, TileType } from '@app/enums/enums';
import { GameSession } from '@app/interfaces/GameSession';
import { Item } from '@app/model/database/item';
import { Player } from '@app/model/database/player';
import { Tile } from '@app/model/database/tile';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
// import { InventoryManagerService } from '@app/services/inventory-manager/inventory-manager.service';
import { ItemEffectsService } from '@app/services/item-effects/item-effects.service';

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
        gameSession.turn.beginnerPlayer = this.turnService.getNextPlayer(accessCode, gameSession.turn);
        this.turnService.endTurn(gameSession.turn);
        this.startTransitionPhase(accessCode);
    }

    // bouge ca
    async updatePlayerPosition(accessCode: string, movement: Tile[], player: Player): Promise<void> {
        const gameSession = this.gameSessions.get(accessCode);
        let isCurrentlyMoving = true;
        for (let i = 1; i < movement.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, PLAYER_MOVE_DELAY));
            this.gridManager.clearPlayerFromGrid(gameSession.game.grid, player.name);
            this.gridManager.setPlayerOnTile(gameSession.game.grid, movement[i], player);

            player.inventory.forEach((item, index) => {
                if (item?.name === ItemName.Swap) {
                    if (movement[i].type === TileType.Ice) {
                        this.itemEffectsService.addEffect(player, item, movement[i]);
                    } else {
                        this.itemEffectsService.removeEffects(player, index);
                    }
                }
            });

            if (i === movement.length - 1) {
                isCurrentlyMoving = false;
            }
            if (movement[i].item && movement[i].item !== undefined) {
                // peut etre que le check pour undefined nest pas necessaire, a voir durant les tests
                if (movement[i].item.name !== ItemName.Home) {
                    isCurrentlyMoving = false;
                }
            }
            if (!isCurrentlyMoving && movement[i].item && movement[i].item !== undefined) {
                // peut etre que le check pour undefined nest pas necessaire, a voir durant les tests
                if (movement[i].item.name !== ItemName.Home) {
                    this.addItemToPlayer(accessCode, player, movement[i].item, this.getGameSession(accessCode));
                    break;
                }
            }
            this.eventEmitter.emit(EventEmit.GamePlayerMovement, {
                accessCode,
                grid: gameSession.game.grid,
                player,
                isCurrentlyMoving,
            });

            if (this.gridManager.isFlagOnSpawnPoint(gameSession.game.grid, player, movement[i])) {
                const sameTeamPlayers: string[] = [];

                for (const playerOfList of gameSession.turn.orderedPlayers) {
                    if (playerOfList.team === player.team) {
                        sameTeamPlayers.push(playerOfList.name);
                    }
                }

                this.endGameSession(accessCode, sameTeamPlayers);
            }
        }
    }

    updateDoorTile(accessCode: string, previousTile: Tile, newTile: Tile): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        gameSession.game.grid = this.gridManager.updateDoorTile(gameSession.game.grid, accessCode, previousTile, newTile);
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

    updateGameSessionPlayerList(accessCode: string, playername: string, updates: Partial<Player>): void {
        const players = this.getPlayers(accessCode);
        const player = players.find((p) => p.name === playername);
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
        return gameSession.turn.currentPlayer.name === playerName && !player?.hasAbandoned;
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
        let turn;
        if (gameMode === GameMode.CTF) {
            turn = this.turnService.initializeTurnCTF(accessCode);
        } else {
            turn = this.turnService.initializeTurn(accessCode);
        }
        turn.beginnerPlayer = turn.orderedPlayers[0];
        const [players, updatedGrid] = this.gridManager.assignPlayersToSpawnPoints(turn.orderedPlayers, spawnPoints, grid);
        game.grid = updatedGrid;
        const gameSession: GameSession = { game, turn };
        this.gameSessions.set(accessCode, gameSession);
        this.updatePlayerListSpawnPoint(players, accessCode);
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
            this.updateGameSessionPlayerList(accessCode, updatedPlayer.name, { inventory: updatedPlayer.inventory });
        }
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
