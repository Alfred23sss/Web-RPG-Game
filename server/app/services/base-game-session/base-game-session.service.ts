import { EventEmit, ImageType, ItemName } from '@app/enums/enums';
import { GameSession } from '@app/interfaces/GameSession';
import { Item } from '@app/model/database/item';
import { Player } from '@app/model/database/player';
import { Tile } from '@app/model/database/tile';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const PLAYER_MOVE_DELAY = 150;
const RANDOMIZER = 0.5;

@Injectable()
export abstract class BaseGameSessionService {
    protected gameSessions: Map<string, GameSession> = new Map<string, GameSession>();

    constructor(
        protected readonly eventEmitter: EventEmitter2,
        protected readonly lobbyService: LobbyService,
        protected readonly gridManager: GridManagerService,
        protected readonly turnService: GameSessionTurnService,
    ) {}

    endTurn(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;
        gameSession.turn.beginnerPlayer = this.turnService.getNextPlayer(accessCode, gameSession.turn);
        this.turnService.endTurn(gameSession.turn);
        this.startTransitionPhase(accessCode);
    }

    async updatePlayerPosition(accessCode: string, movement: Tile[], player: Player): Promise<void> {
        const gameSession = this.gameSessions.get(accessCode);
        let isCurrentlyMoving = true;
        for (let i = 1; i < movement.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, PLAYER_MOVE_DELAY));
            this.gridManager.clearPlayerFromGrid(gameSession.game.grid, player.name);
            this.gridManager.setPlayerOnTile(gameSession.game.grid, movement[i], player);
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

    callTeleport(accessCode: string, player: Player, targetTile: Tile): void {
        const updatedGrid = this.gridManager.teleportPlayer(this.getGameSession(accessCode).game.grid, player, targetTile);
        this.getGameSession(accessCode).game.grid = updatedGrid;
        this.emitGridUpdate(accessCode, updatedGrid);
    }

    handleItemDropped(accessCode: string, player: Player, item: Item): void {
        const index = player.inventory.findIndex((invItem) => invItem.id === item.id);
        const tile = this.gridManager.findTileByPlayer(this.getGameSession(accessCode).game.grid, player);
        if (index !== -1) {
            player.inventory.splice(index, 1);
            player.inventory.push(tile.item);
            tile.item = item;
            tile.player = player;
        }
        this.emitGridUpdate(accessCode, this.getGameSession(accessCode).game.grid);
        this.updateGameSessionPlayerList(accessCode, player.name, { inventory: player.inventory });
        this.eventEmitter.emit(EventEmit.PlayerUpdate, {
            accessCode,
            player,
        });
    }

    updateGameSessionPlayerList(accessCode: string, playername: string, updates: Partial<Player>): void {
        const players = this.getPlayers(accessCode);
        const player = players.find((p) => p.name === playername);
        this.updatePlayer(player, updates);
    }

    getPlayers(accessCode: string): Player[] {
        const gameSession = this.gameSessions.get(accessCode);
        return gameSession ? gameSession.turn.orderedPlayers : [];
    }

    endGameSession(accessCode: string, winner: string) {
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

    handlePlayerItemReset(accessCode: string, player: Player): void {
        const gameSession = this.getGameSession(accessCode);
        const grid = gameSession.game.grid;
        const playerTile = this.gridManager.findTileByPlayer(grid, player);

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
        player.inventory = [null, null];

        this.emitGridUpdate(accessCode, grid);
        this.updateGameSessionPlayerList(accessCode, player.name, { inventory: player.inventory });

        this.eventEmitter.emit(EventEmit.PlayerUpdate, {
            accessCode,
            player,
        });
    }

    emitGridUpdate(accessCode: string, grid: Tile[][]): void {
        this.eventEmitter.emit(EventEmit.GameGridUpdate, {
            accessCode,
            grid,
        });
    }

    protected startTransitionPhase(accessCode: string): void {
        const gameSession = this.gameSessions.get(accessCode);
        if (!gameSession) return;

        this.turnService.startTransitionPhase(accessCode, gameSession.turn);
    }

    protected updatePlayer(player: Player, updates: Partial<Player>): void {
        this.turnService.updatePlayer(player, updates);
    }

    protected updatePlayerListSpawnPoint(players: Player[], accessCode: string): void {
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

    protected addItemToPlayer(accessCode: string, player: Player, item: Item, gameSession: GameSession): void {
        const tile = this.gridManager.findTileByPlayer(gameSession.game.grid, player);
        if (tile.item) {
            for (let i = 0; i < player.inventory.length; i++) {
                if (!player.inventory[i]) {
                    player.inventory[i] = tile.item;
                    tile.item = undefined;
                    this.updateGameSessionPlayerList(accessCode, player.name, { inventory: player.inventory });
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
        this.eventEmitter.emit(EventEmit.ItemChoice, {
            player,
            items,
        });
    }

    protected emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }

    // ajouter ici toutes les methodes communes
    abstract createGameSession(accessCode: string): GameSession;
    abstract handlePlayerAbandoned(accessCode: string, playerName: string): Player | null;
    abstract deleteGameSession(accessCode: string);
    // ajouter ici toutes les methodes differentes
}
