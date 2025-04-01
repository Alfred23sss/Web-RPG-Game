import { EventEmit } from '@app/enums/enums';
import { GameSession } from '@app/interfaces/GameSession';
import { Player } from '@app/interfaces/Player';
import { BaseGameSessionService } from '@app/services/base-game-session/base-game-session.service';
import { GameSessionTurnService } from '@app/services/game-session-turn/game-session-turn.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { ItemEffectsService } from '@app/services/item-effects/item-effects.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
// import { InventoryManagerService } from '@app/services/inventory-manager/inventory-manager.service';

@Injectable()
export class ClassicGameSessionService extends BaseGameSessionService {
    protected gameSessions: Map<string, GameSession> = new Map<string, GameSession>();

    constructor(
        // private readonly inventoryManager: InventoryManagerService,
        lobbyService: LobbyService,
        eventEmitter: EventEmitter2,
        gridManager: GridManagerService,
        turnService: GameSessionTurnService,
        itemEffectsService: ItemEffectsService,
    ) {
        super(eventEmitter, lobbyService, gridManager, turnService, itemEffectsService);
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
}
