import { EventEmit } from '@app/enums/enums';
import { Player } from '@app/interfaces/Player';
import { Item } from '@app/model/database/item';
import { Tile } from '@app/model/database/tile';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
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

    constructor(
        private readonly logger: Logger,
        private readonly lobbyService: LobbyService,
        private readonly gameSessionService: GameSessionService,
        private readonly gameCombatService: GameCombatService,
        private readonly accessCodesService: AccessCodesService,
    ) {}

    @SubscribeMessage(GameEvents.CreateGame)
    handleCreateGame(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; grid: Tile[][] }) {
        this.logger.log(payload.accessCode);
        const gameSession = this.gameSessionService.createGameSession(payload.accessCode);
        this.server.to(payload.accessCode).emit('gameStarted', { orderedPlayers: gameSession.turn.orderedPlayers, updatedGame: gameSession.game });
        Logger.log('emitting gameStarted');
        this.logger.log('game created emitted');
    }

    @SubscribeMessage(GameEvents.AbandonedGame)
    handleGameAbandoned(@ConnectedSocket() client: Socket, @MessageBody() payload: { player: Player; accessCode: string }) {
        this.logger.log(`Player ${payload.player.name} has abandoned game`);
        if (!this.gameSessionService.getGameSession(payload.accessCode)) return;
        this.gameCombatService.handleCombatSessionAbandon(payload.accessCode, payload.player.name);
        const playerAbandon = this.gameSessionService.handlePlayerAbandoned(payload.accessCode, payload.player.name);
        const lobby = this.lobbyService.getLobby(payload.accessCode);
        this.logger.log(`Lobby ${lobby} has left lobby`);
        this.lobbyService.leaveLobby(payload.accessCode, payload.player.name, true);
        client.leave(payload.accessCode);

        if (lobby.players.length <= 1) {
            this.lobbyService.clearLobby(payload.accessCode);
            this.gameSessionService.deleteGameSession(payload.accessCode);
            this.accessCodesService.removeAccessCode(payload.accessCode);
            this.server.to(payload.accessCode).emit('gameDeleted');
            this.server.to(payload.accessCode).emit('updateUnavailableOptions', { avatars: [] });
        }
        this.server.to(client.id).emit('updateUnavailableOptions', { avatars: [] });
        this.server.to(payload.accessCode).emit('game-abandoned', { player: playerAbandon });
        this.logger.log('game abandoned emitted');
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
        this.logger.log(`Starting combat for game ${payload.accessCode}`);
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

    @OnEvent(EventEmit.GameCombatEnded)
    handleCombatEnded(payload: { attacker: Player; defender: Player; currentFighter: Player; hasEvaded: boolean }): void {
        const attackerSocketId = this.lobbyService.getPlayerSocket(payload.attacker.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(payload.defender.name);

        this.server.to([attackerSocketId, defenderSocketId]).emit('combatEnded', {
            winner: payload.currentFighter,
            hasEvaded: payload.hasEvaded,
        });
    }

    @OnEvent(EventEmit.GameTurnResumed)
    handleGameTurnResumed(payload: { accessCode: string; player: Player }): void {
        this.server.to(payload.accessCode).emit('gameTurnResumed', {
            player: payload.player,
        });
    }

    @OnEvent(EventEmit.GameCombatEscape)
    handleNoMoreEscapeAttempts(payload: { player: Player; attemptsLeft: number; isEscapeSuccessful: boolean }): void {
        const playerSocketId = this.lobbyService.getPlayerSocket(payload.player.name);
        this.server.to(playerSocketId).emit('escapeAttempt', {
            attemptsLeft: payload.attemptsLeft,
            isEscapeSuccessful: payload.isEscapeSuccessful,
        });
    }

    @OnEvent(EventEmit.GameDoorUpdate)
    handleDoorUpdateEvent(payload: { accessCode: string; grid: Tile[][] }) {
        this.server.to(payload.accessCode).emit('doorClicked', {
            grid: payload.grid,
        });
        this.logger.log(payload.grid);
        this.logger.log('Door update event emitted');
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
        this.server.to(socketId).emit('itemChoice', {
            items: payload.items,
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
        this.logger.log(`Received turn started event for game ${payload.accessCode}`);
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
        attackerScore: number;
        defenseScore: number;
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
    handleDefenderHealthUpdate(payload: { player: Player }) {
        const socketId = this.lobbyService.getPlayerSocket(payload.player.name);
        this.server.to(socketId).emit('playerUpdate', {
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
            // firstFighter: payload.firstFighter, // we never use firstFighter client side ???
            attacker: payload.attacker,
            defender: payload.defender,
        });
    }

    @OnEvent(EventEmit.GameEnded)
    handleGameEnded(payload: { accessCode: string; winner: string }) {
        this.logger.log('emitting game ended to client');

        this.gameSessionService.deleteGameSession(payload.accessCode);
        this.server.to(payload.accessCode).emit('gameEnded', { winner: payload.winner });
        this.server.to(payload.accessCode).emit('updateUnavailableOptions', { avatars: [] });
        const lobbyPlayers = this.lobbyService.getLobbyPlayers(payload.accessCode);
        this.lobbyService.clearLobby(payload.accessCode);
        for (const player of lobbyPlayers) {
            const playerSocketId = this.lobbyService.getPlayerSocket(player.name);
            const playerClient = this.server.sockets.sockets.get(playerSocketId);
            if (playerClient) {
                playerClient.leave(payload.accessCode);
            }
        }
    }

    @OnEvent(EventEmit.GameCombatTimer)
    handleCombatTimerUpdate(payload: { accessCode: string; attacker: Player; defender: Player; timeLeft: number }) {
        const attackerSocketId = this.lobbyService.getPlayerSocket(payload.attacker.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(payload.defender.name);
        this.logger.log(`attacker socket id ${attackerSocketId}, defender socket it ${defenderSocketId}`);

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
        this.logger.log(`attacker socket id ${attackerSocketId}, defender socket it ${defenderSocketId}`);

        this.server.to([attackerSocketId, defenderSocketId]).emit('combatTurnStarted', {
            fighter: payload.player,
        });
    }
}
