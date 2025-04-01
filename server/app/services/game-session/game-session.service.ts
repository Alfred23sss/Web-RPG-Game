import { EventEmit, ImageType, ItemName, TileType } from '@app/enums/enums';
import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/model/database/tile';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
// import { InventoryManagerService } from '@app/services/inventory-manager/inventory-manager.service';
import { Item } from '@app/interfaces/Item';
import { ItemEffectsService } from '@app/services/item-effects/item-effects.service';

const PLAYER_MOVE_DELAY = 150;
const RANDOMIZER = 0.5;

@Injectable()
export class GameSessionService {
    private gameSessions: Map<string, GameSession> = new Map<string, GameSession>();

    constructor(
        // private readonly inventoryManager: InventoryManagerService,
        private readonly lobbyService: LobbyService,
        private readonly eventEmitter: EventEmitter2,
        private readonly gridManager: GridManagerService,
        private readonly turnService: GameSessionTurnService,
        private readonly itemEffectsService: ItemEffectsService,
    ) {
        this.eventEmitter.on(EventEmit.GameTurnTimeout, ({ accessCode }) => {
            this.endTurn(accessCode);
        });
    }

    createGameSession(accessCode: string): GameSession {
        const lobby = this.lobbyService.getLobby(accessCode);
        const game = lobby.game;
        const grid = this.gridManager.assignItemsToRandomItems(game.grid);
        const spawnPoints = this.gridManager.findSpawnPoints(grid);
        const turn = this.turnService.initializeTurn(accessCode);
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

    getPlayers(accessCode: string): Player[] {
        const gameSession = this.gameSessions.get(accessCode);
        return gameSession ? gameSession.turn.orderedPlayers : [];
    }

    endTurn(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        gameSession.turn.beginnerPlayer = this.turnService.getNextPlayer(accessCode, gameSession.turn);
        this.turnService.endTurn(gameSession.turn);
        this.startTransitionPhase(accessCode);
    }

    pauseGameTurn(accessCode: string): number {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return 0;

        return this.turnService.pauseTurn(gameSession.turn);
    }

    resumeGameTurn(accessCode: string, remainingTime: number): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        this.turnService.resumeTurn(accessCode, gameSession.turn, remainingTime);
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

    updateDoorTile(accessCode: string, previousTile: Tile, newTile: Tile): void {
        const grid = this.gameSessions.get(accessCode).game.grid;
        const isAdjacent = this.gridManager.findAndCheckAdjacentTiles(previousTile.id, newTile.id, grid);
        if (!isAdjacent) return;
        const targetTile = grid.flat().find((tile) => tile.id === newTile.id);

        if (targetTile.isOpen) {
            targetTile.imageSrc = ImageType.ClosedDoor;
        } else {
            targetTile.imageSrc = ImageType.OpenDoor;
        }
        targetTile.isOpen = !targetTile.isOpen;
        this.gameSessions.get(accessCode).game.grid = grid;
        this.eventEmitter.emit(EventEmit.GameDoorUpdate, { accessCode, grid });
    }

    updateWallTile(accessCode: string, previousTile: Tile, newTile: Tile, player: Player): void {
        const grid = this.gameSessions.get(accessCode).game.grid;
        const isAdjacent = this.gridManager.findAndCheckAdjacentTiles(previousTile.id, newTile.id, grid);
        if (!isAdjacent) return;
        const targetTile = grid.flat().find((tile) => tile.id === newTile.id);
        targetTile.type = TileType.Default;
        player.actionPoints--;
        this.gameSessions.get(accessCode).game.grid = grid;
        this.eventEmitter.emit(EventEmit.PlayerUpdate, {
            accessCode,
            player,
        });
        this.eventEmitter.emit(EventEmit.GameWallUpdate, { accessCode, grid });
    }

    updatePlayer(player: Player, updates: Partial<Player>): void {
        this.turnService.updatePlayer(player, updates);
    }

    updateGameSessionPlayerList(accessCode: string, playername: string, updates: Partial<Player>): void {
        const players = this.getPlayers(accessCode);
        const player = players.find((p) => p.name === playername);
        this.updatePlayer(player, updates);
    }

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
            this.eventEmitter.emit(EventEmit.GamePlayerMovement, {
                accessCode,
                grid: gameSession.game.grid,
                player,
                isCurrentlyMoving,
            });
            if (!isCurrentlyMoving && movement[i].item && movement[i].item !== undefined) {
                // peut etre que le check pour undefined nest pas necessaire, a voir durant les tests
                if (movement[i].item.name !== ItemName.Home) {
                    this.addItemToPlayer(accessCode, player, movement[i].item, this.getGameSession(accessCode));
                    break;
                }
            }
        }
    }

    endGameSession(accessCode: string, winner: string) {
        this.emitEvent(EventEmit.GameEnded, { accessCode, winner });
    }

    getGameSession(accessCode: string): GameSession {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        return gameSession;
    }

    callTeleport(accessCode: string, player: Player, targetTile: Tile): void {
        const updatedGrid = this.gridManager.teleportPlayer(this.getGameSession(accessCode).game.grid, player, targetTile);
        this.getGameSession(accessCode).game.grid = updatedGrid;
        this.emitGridUpdate(accessCode, updatedGrid);
    }

    emitGridUpdate(accessCode: string, grid: Tile[][]): void {
        this.eventEmitter.emit(EventEmit.GameGridUpdate, {
            accessCode,
            grid,
        });
    }

    addItemToPlayer(accessCode: string, player: Player, item: Item, gameSession: GameSession): void {
        const tile = this.gridManager.findTileByPlayer(gameSession.game.grid, player);
        if (tile.item) {
            for (let i = 0; i < player.inventory.length; i++) {
                if (!player.inventory[i]) {
                    player.inventory[i] = tile.item;
                    this.itemEffectsService.addEffect(player, tile.item, tile);
                    tile.item = undefined;
                    player = {
                        ...player,
                        attack: { ...player.attack },
                        defense: { ...player.defense },
                        hp: { ...player.hp },
                        speed: player.speed,
                        inventory: player.inventory,
                    };
                    this.updateGameSessionPlayerList(accessCode, player.name, { ...player });
                    this.emitGridUpdate(accessCode, gameSession.game.grid);
                    this.eventEmitter.emit(EventEmit.GamePlayerMovement, {
                        accessCode,
                        grid: gameSession.game.grid,
                        player,
                        isCurrentlyMoving: false,
                    });
                    return;
                }
            }
        }
        const items = [player.inventory[0], player.inventory[1], item];
        Logger.log('on emit ItemChoice au Gateway');
        this.eventEmitter.emit(EventEmit.ItemChoice, {
            player,
            items,
        });
    }

    handleItemDropped(accessCode: string, player: Player, item: Item): void {
        const index = player.inventory.findIndex((invItem) => invItem.id === item.id);
        const tile = this.gridManager.findTileByPlayer(this.getGameSession(accessCode).game.grid, player);
        if (index !== -1) {
            this.itemEffectsService.removeEffects(player, index);
            const newItem = tile.item;
            player.inventory.splice(index, 1);
            player.inventory.push(tile.item);
            tile.item = item;
            tile.player = player;
            this.itemEffectsService.addEffect(player, newItem, tile);
        }
        player = {
            ...player,
            attack: { ...player.attack },
            defense: { ...player.defense },
            hp: { ...player.hp },
            speed: player.speed,
            inventory: player.inventory,
        };
        this.emitGridUpdate(accessCode, this.getGameSession(accessCode).game.grid);
        this.updateGameSessionPlayerList(accessCode, player.name, { ...player });
        this.eventEmitter.emit(EventEmit.PlayerUpdate, {
            accessCode,
            player,
        });
    }

    handlePlayerItemReset(accessCode: string, player: Player): void {
        const gameSession = this.getGameSession(accessCode);
        const grid = gameSession.game.grid;
        const playerTile = this.gridManager.findTileByPlayer(grid, player);

        player.inventory.forEach((item, index) => {
            if (item !== null) {
                this.itemEffectsService.removeEffects(player, index);
            }
        });

        const shuffledInventory = [...player.inventory].sort(() => Math.random() - RANDOMIZER);

        if (shuffledInventory.length > 0 && !playerTile.item) {
            playerTile.item = shuffledInventory.shift();
        }
        shuffledInventory.forEach((item) => {
            const availableTile = this.gridManager.findClosestAvailableTile(grid, playerTile);
            if (availableTile) {
                availableTile.item = item;
            }
        });
        player = {
            ...player,
            attack: { ...player.attack },
            defense: { ...player.defense },
            hp: { ...player.hp },
            speed: player.speed,
            inventory: [null, null],
        };
        this.emitGridUpdate(accessCode, grid);
        this.updateGameSessionPlayerList(accessCode, player.name, { ...player });

        this.eventEmitter.emit(EventEmit.PlayerUpdate, {
            accessCode,
            player,
        });
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

    private startTransitionPhase(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        this.turnService.startTransitionPhase(accessCode, gameSession.turn);
    }

    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
