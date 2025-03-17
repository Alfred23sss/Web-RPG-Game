import { Player } from '@app/interfaces/Player';
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
        // const lobby = this.lobbyService.getLobby(payload.accessCode);
        const gameSession = this.gameSessionService.createGameSession(payload.accessCode);
        this.server.to(payload.accessCode).emit('gameStarted', { orderedPlayers: gameSession.turn.orderedPlayers, updatedGame: gameSession.game });
        Logger.log('emitting gameStarted');
        this.logger.log('game created emitted');
        // this.server.to(payload.accessCode).emit('turnStarted');
    }

    @SubscribeMessage(GameEvents.AbandonedGame)
    handleGameAbandoned(@ConnectedSocket() client: Socket, @MessageBody() payload: { player: Player; accessCode: string }) {
        this.logger.log(`Player ${payload.player.name} has abandoned game`);
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
        }
        this.server.to(payload.accessCode).emit('game-abandoned', { player: playerAbandon });
        this.logger.log('game abandoned emitted');
    }

    @SubscribeMessage(GameEvents.EndTurn)
    handleEndTurn(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string }) {
        this.logger.log(`Ending turn for game ${payload.accessCode}`);
        this.gameSessionService.endTurn(payload.accessCode);
    }

    @SubscribeMessage(GameEvents.StartCombat)
    handleStartCombat(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; attackerName: string; defenderName: string }) {
        this.logger.log(`Starting combat for game ${payload.accessCode}`);
        this.gameCombatService.startCombat(payload.accessCode, payload.attackerName, payload.defenderName);
    }

    @SubscribeMessage(GameEvents.PerformAttack)
    handlePerformAttack(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; attackerName: string }) {
        this.logger.log(`Player ${payload.attackerName} is attacking in game ${payload.accessCode}`);
        this.gameCombatService.performAttack(payload.accessCode, payload.attackerName);
    }

    // @SubscribeMessage(GameEvents.AttemptEscape)
    // handleAttemptEscape(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; playerName: string }) {
    //     this.logger.log(`Player ${payload.playerName} is attempting to escape in game ${payload.accessCode}`);
    //     this.gameCombatService.attemptEscape(payload.accessCode, payload.playerName);
    // }

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

    @OnEvent('game.combat.ended')
    handleCombatEnded(payload: { attackerSocketId: string; defenderSocketId: string }): void {
        this.logger.log('sending to client combat ended');
        this.logger.log(`socked id 1 : ${payload.attackerSocketId}, socket id 2: ${payload.defenderSocketId}`);
        this.server.to([payload.attackerSocketId, payload.defenderSocketId]).emit('combatEnded');
    }

    @OnEvent('game.combat.escape.failed')
    handleNoMoreEscapeAttempts(payload: { player: Player; playerSocketId: string }): void {
        this.server.to(payload.playerSocketId).emit('noMoreEscapesLeft', {
            player: payload.player,
        });
    }

    @OnEvent('game.door.update')
    handleDoorUpdateEvent(payload: { accessCode: string; grid: Tile[][] }) {
        this.server.to(payload.accessCode).emit('doorClicked', {
            grid: payload.grid,
        });
        this.logger.log(payload.grid);
        this.logger.log('Door update event emitted');
    }
    @OnEvent('game.grid.update')
    handleGridUpdateEvent(payload: { accessCode: string; grid: Tile[][] }) {
        this.server.to(payload.accessCode).emit('gridUpdate', {
            grid: payload.grid,
        });
    }

    @OnEvent('game.player.movement')
    handlePlayerMovement(payload: { accessCode: string; grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) {
        this.server.to(payload.accessCode).emit('playerMovement', {
            grid: payload.grid,
            player: payload.player,
            isCurrentlyMoving: payload.isCurrentlyMoving,
        });
    }

    @OnEvent('game.transition.started')
    handleTransitionStarted(payload: { accessCode: string; nextPlayer: Player }) {
        this.logger.log(`Received transition started event for game ${payload.accessCode}`);
        this.server.to(payload.accessCode).emit('transitionStarted', {
            nextPlayer: payload.nextPlayer,
            transitionDuration: 3,
        });
    }

    @OnEvent('game.turn.started')
    handleTurnStarted(payload: { accessCode: string; player: Player }) {
        this.logger.log(`Received turn started event for game ${payload.accessCode}`);
        this.server.to(payload.accessCode).emit('turnStarted', {
            player: payload.player,
            turnDuration: 30,
        });
    }

    @OnEvent('game.combat.attack.result')
    handleCombatResult(payload: { attackerId: string; defenderId: string; success: boolean; attackScore: number; defenseScore: number }) {
        this.logger.log('emiting combat attack result');
        this.server
            .to([payload.attackerId, payload.defenderId])
            .emit('attackResult', { success: payload.success, attackScore: payload.attackScore, defenseScore: payload.defenseScore });
    }

    @OnEvent('update.player')
    handleDefenderHealthUpdate(payload: { player: Player; playerSocketId: string }) {
        if (!payload.playerSocketId) {
            this.logger.error('defenderSocketId is undefined or null');
        }
        this.logger.log('emitting player updates ' + payload.playerSocketId);
        this.server.to(payload.playerSocketId).emit('playerUpdate', {
            player: payload.player,
        });
    }

    @OnEvent('update.player.list')
    handleUpdatePlayerList(payload: { players: Player[]; accessCode: string }) {
        this.server.to(payload.accessCode).emit('playerListUpdate', {
            players: payload.players, // Fix: changed "player" to "players"
        });
    }

    @OnEvent('game.turn.timer')
    handleTimerUpdate(payload: { accessCode: string; timeLeft: number }) {
        this.server.to(payload.accessCode).emit('timerUpdate', {
            timeLeft: payload.timeLeft,
        });
    }

    @OnEvent('game.combat.started')
    handleCombatStarted(payload: { accessCode: string; attackerSocketId: string; defenderSocketId: string }) {
        this.logger.log(
            `Combat started in game ${payload.accessCode}, socket attatque ${payload.attackerSocketId} et socket defense ${payload.defenderSocketId}`,
        );
        this.server.to([payload.attackerSocketId, payload.defenderSocketId]).emit('combatStarted');
    }

    @OnEvent('game.combat.timer')
    handleCombatTimerUpdate(payload: { accessCode: string; timeLeft: number }) {
        this.server.to(payload.accessCode).emit('combatTimerUpdate', {
            timeLeft: payload.timeLeft,
        });
    }

    @OnEvent('game.combat.timeout')
    handleCombatTimeout(payload: { accessCode: string; fighter: Player }) {
        this.logger.log(`Combat timeout for ${payload.fighter.name} in game ${payload.accessCode}`);
        this.server.to(payload.accessCode).emit('combatTimeout', {
            fighter: payload.fighter,
        });
    }

    @OnEvent('game.combat.turn.started')
    handleCombatTurnStarted(payload: { accessCode: string; fighter: Player; duration: number; escapeAttemptsLeft: number }) {
        this.logger.log(`Combat turn started for ${payload.fighter.name} in game ${payload.accessCode}`);
        this.server.to(payload.accessCode).emit('combatTurnStarted', {
            fighter: payload.fighter,
            duration: payload.duration,
            escapeAttemptsLeft: payload.escapeAttemptsLeft,
        });
    }
}
