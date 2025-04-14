import { EventEmit, GameModeType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { AttackScore } from '@app/interfaces/AttackScore';
import { Player } from '@app/interfaces/Player';
import { Item } from '@app/model/database/item';
import { Tile } from '@app/model/database/tile';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameEvents } from './game.gateway.events';

@WebSocketGateway({ cors: true })
export class GameGateway {
    @WebSocketServer()
    server: Server;

    // faudra split ce gateway en plusieurs fichiers anyways!
    // eslint-disable-next-line max-params
    constructor(
        private readonly logger: Logger,
        private readonly lobbyService: LobbyService,
        private readonly gameSessionService: GameSessionService,
        private readonly gameCombatService: GameCombatService,
        private readonly accessCodesService: AccessCodesService,
        private readonly statisticsService: GameStatisticsService,
    ) {}

    @SubscribeMessage(GameEvents.CreateGame)
    handleCreateGame(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; gameMode: GameModeType }) {
        this.logger.log(payload.accessCode);
        this.gameSessionService.createGameSession(payload.accessCode, payload.gameMode);
        const gameSession = this.gameSessionService.getGameSession(payload.accessCode);
        this.logger.log(`type du service cree ${payload.gameMode}`);
        this.server.to(payload.accessCode).emit('gameStarted', {
            orderedPlayers: gameSession.turn.orderedPlayers,
            updatedGame: gameSession.game,
        });
        Logger.log('emitting gameStarted');
        this.logger.log('game created emitted');
    }

    @SubscribeMessage(GameEvents.EndTurn)
    handleEndTurn(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string }) {
        this.logger.log(`Ending turn for game ${payload.accessCode}`);
        this.gameSessionService.endTurn(payload.accessCode);
    }

    @SubscribeMessage(GameEvents.StartCombat)
    handleStartCombat(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { accessCode: string; attackerName: string; defenderName: string; isDebugMode: boolean },
    ) {
        this.logger.log(`Starting combat for game ${payload.accessCode}, ${payload.attackerName} and ${payload.defenderName}`);
        this.gameCombatService.startCombat(payload.accessCode, payload.attackerName, payload.defenderName, payload.isDebugMode);
    }

    @SubscribeMessage(GameEvents.PerformAttack)
    handlePerformAttack(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; attackerName: string }) {
        this.logger.log(`Player ${payload.attackerName} is attacking in game ${payload.accessCode}`);
        this.gameCombatService.performAttack(payload.accessCode, payload.attackerName);
    }

    @SubscribeMessage(GameEvents.PlayerMovementUpdate)
    async handlePlayerMovementUpdate(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { accessCode: string; previousTile: Tile; newTile: Tile; movement: Tile[] },
    ): Promise<void> {
        const player: Player = payload.previousTile.player;

        try {
            await this.gameSessionService.updatePlayerPosition(payload.accessCode, payload.movement, player);
        } catch (err) {
            this.logger.error('Error updating player position', err);
        }
    }

    @SubscribeMessage(GameEvents.DoorUpdate)
    handleDoorUpdate(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; currentTile: Tile; targetTile: Tile }) {
        this.gameSessionService.updateDoorTile(payload.accessCode, payload.currentTile, payload.targetTile);
        this.logger.log('Door update emitted');
    }

    @SubscribeMessage(GameEvents.WallUpdate)
    handleWallUpdate(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { accessCode: string; currentTile: Tile; targetTile: Tile; player: Player },
    ) {
        this.gameSessionService.updateWallTile(payload.accessCode, payload.currentTile, payload.targetTile, payload.player);
        this.logger.log('Door update emitted');
    }

    @SubscribeMessage(GameEvents.Evade)
    handleEvade(@MessageBody() payload: { accessCode: string; player: Player }) {
        this.gameCombatService.attemptEscape(payload.accessCode, payload.player);
        this.logger.log('Escape attempt received by server');
    }

    @SubscribeMessage(GameEvents.AdminModeUpdate)
    handleAdminModeUpdate(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string }) {
        this.server.to(payload.accessCode).emit('adminModeChangedServerSide');
        this.logger.log('Admin Mode Changed');
    }

    @SubscribeMessage(GameEvents.TeleportPlayer)
    handleTeleportPlayer(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; player: Player; targetTile: Tile }) {
        this.logger.log(payload.targetTile);
        this.gameSessionService.callTeleport(payload.accessCode, payload.player, payload.targetTile);
        this.logger.log('player teleported');
    }

    @SubscribeMessage(GameEvents.DecrementItem)
    handleDecrementItem(@ConnectedSocket() client: Socket, @MessageBody() payload: { selectedItem: Item; accessCode: string; player: Player }): void {
        Logger.log(`Decrementing item ${payload.selectedItem.name} for player ${payload.player.name}`);
        this.statisticsService.decrementItem(payload.accessCode, payload.selectedItem, payload.player);
    }

    // no need to receive it here
    @SubscribeMessage(GameEvents.ItemDrop)
    handleItemDrop(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; player: Player; item: Item }) {
        this.gameSessionService.handleItemDropped(payload.accessCode, payload.player, payload.item);
    }

    @SubscribeMessage(GameEvents.PlayerItemReset)
    handlePlayerItemReset(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; player: Player }) {
        this.gameSessionService.handlePlayerItemReset(payload.accessCode, payload.player);
    }

    @OnEvent(EventEmit.GameCombatEnded)
    handleCombatEnded(payload: { attacker: Player; defender: Player; currentFighter: Player; hasEvaded: boolean; accessCode: string }): void {
        if (payload.attacker.name === payload.currentFighter.name && payload.attacker.isVirtual) {
            this.gameCombatService.emitEvent(EventEmit.VPActionDone, payload.accessCode);
        }
        if (payload.attacker.isVirtual && payload.attacker.name !== payload.currentFighter.name) {
            this.gameCombatService.emitEvent(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode: payload.accessCode });
        }

        const attackerSocketId = this.lobbyService.getPlayerSocket(payload.attacker.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(payload.defender.name);

        this.server.to([attackerSocketId, defenderSocketId]).emit('combatEnded', {
            winner: payload.currentFighter,
            hasEvaded: payload.hasEvaded,
        });

        this.server.to(payload.accessCode).emit('combatEndedLog', {
            winner: payload.currentFighter,
            attacker: payload.attacker,
            defender: payload.defender,
            hasEvaded: payload.hasEvaded,
        });
    }

    @OnEvent(EventEmit.GameTurnResumed)
    handleGameTurnResumed(payload: { accessCode: string; player: Player }): void {
        this.logger.log(`resuming turn for ${payload.player.name}`);
        this.server.to(payload.accessCode).emit('gameTurnResumed', {
            player: payload.player,
        });
    }

    @OnEvent(EventEmit.GameCombatEscape)
    handleNoMoreEscapeAttempts(payload: { player: Player; attemptsLeft: number; isEscapeSuccessful: boolean; accessCode: string }): void {
        this.server.to(payload.accessCode).emit('escapeAttempt', {
            attemptsLeft: payload.attemptsLeft,
            isEscapeSuccessful: payload.isEscapeSuccessful,
            player: payload.player,
        });
    }

    @OnEvent(EventEmit.GameDoorUpdate)
    handleDoorUpdateEvent(payload: { accessCode: string; grid: Tile[][]; isOpen: boolean }) {
        this.server.to(payload.accessCode).emit('doorClicked', {
            grid: payload.grid,
            isOpen: payload.isOpen,
        });
        this.logger.log('Door update event emitted');
    }

    @OnEvent(EventEmit.GameWallUpdate)
    handleWallUpdateEvent(payload: { accessCode: string; grid: Tile[][] }) {
        this.server.to(payload.accessCode).emit('wallClicked', {
            grid: payload.grid,
        });
        this.logger.log('Wall update event emitted');
    }

    @OnEvent(EventEmit.GameGridUpdate)
    handleGridUpdateEvent(payload: { accessCode: string; grid: Tile[][] }) {
        this.server.to(payload.accessCode).emit('gridUpdate', {
            grid: payload.grid,
        });
    }

    @OnEvent(EventEmit.ItemChoice)
    handleItemChoiceEvent(payload: { player: Player; items: [Item, Item, Item] }) {
        const socketId = this.lobbyService.getPlayerSocket(payload.player.name);
        Logger.log('emitting choice event');
        this.server.to(socketId).emit('itemChoice', {
            items: payload.items,
        });
    }

    // PlayerUpdate pour enum mais valeur de player client update? pas trop clair
    @OnEvent(EventEmit.PlayerUpdate)
    handlePlayerClientUpdate(payload: { accessCode: string; player: Player }) {
        this.logger.log(`playerUpdateClientEventCalled ${payload.player.name}`);
        this.server.to(payload.accessCode).emit('playerClientUpdate', {
            player: payload.player,
        });
    }

    @OnEvent(EventEmit.GamePlayerMovement)
    handlePlayerMovement(payload: { accessCode: string; grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) {
        this.server.to(payload.accessCode).emit('playerMovement', {
            grid: payload.grid,
            player: payload.player,
            isCurrentlyMoving: payload.isCurrentlyMoving,
        });
    }

    @OnEvent(EventEmit.GameTransitionStarted)
    handleTransitionStarted(payload: { accessCode: string; nextPlayer: Player }) {
        this.logger.log(`Received transition started event for game ${payload.accessCode}`);
        this.server.to(payload.accessCode).emit('transitionStarted', {
            nextPlayer: payload.nextPlayer,
            transitionDuration: 3,
        });
    }

    @OnEvent(EventEmit.GameTurnStarted)
    handleTurnStarted(payload: { accessCode: string; player: Player }) {
        this.logger.log(`Received turn started event for game ${payload.accessCode}  and player ${payload.player.name}`);
        this.server.to(payload.accessCode).emit('turnStarted', {
            player: payload.player,
            turnDuration: 30,
        });
    }

    @OnEvent(EventEmit.GameCombatAttackResult)
    handleCombatResult(payload: {
        currentFighter: Player;
        defenderPlayer: Player;
        attackSuccessful: boolean;
        attackerScore: AttackScore;
        defenseScore: AttackScore;
        accessCode: string;
    }) {
        const attackerSocketId = this.lobbyService.getPlayerSocket(payload.currentFighter.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(payload.defenderPlayer.name);

        this.server.to([attackerSocketId, defenderSocketId]).emit('attackResult', {
            success: payload.attackSuccessful,
            attackScore: payload.attackerScore,
            defenseScore: payload.defenseScore,
        });
    }

    @OnEvent(EventEmit.UpdatePlayer)
    handleDefenderHealthUpdate(payload: { player: Player; accessCode: string }) {
        this.logger.log(`playerUpdateEventCalled ${payload.player.name}`);
        // const socketId = this.lobbyService.getPlayerSocket(payload.player.name);
        this.server.to(payload.accessCode).emit('playerUpdate', {
            player: payload.player,
        });
    }

    @OnEvent(EventEmit.UpdatePlayerList)
    handleUpdatePlayerList(payload: { players: Player[]; accessCode: string }) {
        this.server.to(payload.accessCode).emit('playerListUpdate', {
            players: payload.players,
        });
    }

    @OnEvent(EventEmit.GameTurnTimer)
    handleTimerUpdate(payload: { accessCode: string; timeLeft: number }) {
        this.logger.log(`emitting time : ${payload.timeLeft}`);
        this.server.to(payload.accessCode).emit('timerUpdate', {
            timeLeft: payload.timeLeft,
        });
    }

    @OnEvent(EventEmit.GameCombatStarted)
    handleCombatStarted(payload: { accessCode: string; attacker: Player; defender: Player; currentPlayerName: string }) {
        const attackerSocketId = this.lobbyService.getPlayerSocket(payload.attacker.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(payload.defender.name);

        this.server.to([attackerSocketId, defenderSocketId]).emit('combatStarted', {
            attacker: payload.attacker,
            defender: payload.defender,
        });

        this.server.to(payload.accessCode).emit('combatStartedLog', {
            attacker: payload.attacker,
            defender: payload.defender,
        });
    }

    @OnEvent(EventEmit.GameEnded)
    handleGameEnded(payload: { accessCode: string; winner: string[] }) {
        this.logger.log('emitting game ended to client');
        const stats = this.statisticsService.calculateStats(payload.accessCode);
        this.statisticsService.cleanUp(payload.accessCode);
        this.gameSessionService.deleteGameSession(payload.accessCode);
        this.accessCodesService.removeAccessCode(payload.accessCode);
        for (const player of stats.playerStats.values()) {
            Logger.log(player.uniqueItemsCollected.size);
        }
        const statsObject = {
            ...stats,
            playerStats: Object.fromEntries(
                Array.from(stats.playerStats.entries()).map(([key, value]) => [
                    key,
                    {
                        ...value,
                        uniqueItemsCollected: Object.fromEntries(value.uniqueItemsCollected),
                    },
                ]),
            ),
        };
        this.server.to(payload.accessCode).emit('gameEnded', { winner: payload.winner, stats: statsObject });
    }

    @OnEvent(EventEmit.GameCombatTimer)
    handleCombatTimerUpdate(payload: { accessCode: string; attacker: Player; defender: Player; timeLeft: number }) {
        const attackerSocketId = this.lobbyService.getPlayerSocket(payload.attacker.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(payload.defender.name);

        this.server.to([attackerSocketId, defenderSocketId]).emit('combatTimerUpdate', {
            timeLeft: payload.timeLeft,
        });
    }

    @OnEvent(EventEmit.AdminModeDisabled)
    handleAdminModeDisabled(payload: { accessCode: string }) {
        this.server.to(payload.accessCode).emit('adminModeDisabled');
    }

    @OnEvent(EventEmit.GameCombatTurnStarted)
    handleCombatTurnStarted(payload: { accessCode: string; player: Player; defender: Player }) {
        const attackerSocketId = this.lobbyService.getPlayerSocket(payload.player.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(payload.defender.name);
        this.logger.log(`attacker ${payload.player.name}, defender  ${payload.defender.name}`);

        this.server.to([attackerSocketId, defenderSocketId]).emit('combatTurnStarted', {
            fighter: payload.player,
        });
    }

    @OnEvent(EventEmit.TeamCreated)
    handleTeamCreated(payload: { redTeam: Player[]; blueTeam: Player[]; accessCode: string }) {
        for (const player of payload.redTeam) {
            this.logger.log(player.name);
        }
        for (const player of payload.blueTeam) {
            this.logger.log(player.name);
        }
        this.logger.log(`teamCreated ${payload.blueTeam} and ${payload.redTeam}`);
        this.server.to(payload.accessCode).emit('teamCreated', {
            redTeam: payload.redTeam,
            blueTeam: payload.blueTeam,
        });
    }
}
