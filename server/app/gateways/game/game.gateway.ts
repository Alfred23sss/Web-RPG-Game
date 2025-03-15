import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/model/database/tile';
import { GameManagerService } from '@app/services/combat-manager/combat-manager.service';
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
        private readonly gameCombatService: GameManagerService,
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
        const playerAbandon = this.gameSessionService.handlePlayerAbandoned(payload.accessCode, payload.player.name);
        const lobby = this.lobbyService.getLobby(payload.accessCode);
        this.logger.log(`Lobby ${lobby} has left lobby`);

        if (lobby.players.length <= 2) {
            // stop game session here'
            this.lobbyService.leaveLobby(payload.accessCode, payload.player.name);
            client.leave(payload.accessCode);
            this.lobbyService.clearLobby(payload.accessCode);
            this.gameSessionService.deleteGameSession(payload.accessCode);
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
    handleStartCombat(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; attackerId: string; defenderId: string }) {
        this.logger.log(`Starting combat for game ${payload.accessCode}`);
        this.gameCombatService.startCombat(payload.accessCode, payload.attackerId, payload.defenderId);
    }

    @SubscribeMessage(GameEvents.PerformAttack)
    handlePerformAttack(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; attackerName: string }) {
        this.logger.log(`Player ${payload.attackerName} is attacking in game ${payload.accessCode}`);
        this.gameCombatService.performAttack(payload.accessCode, payload.attackerName);
    }

    @SubscribeMessage(GameEvents.AttemptEscape)
    handleAttemptEscape(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string; playerName: string }) {
        this.logger.log(`Player ${payload.playerName} is attempting to escape in game ${payload.accessCode}`);
        this.gameCombatService.attemptEscape(payload.accessCode, payload.playerName);
    }

    @OnEvent('game.transition.started')
    handleTransitionStarted(payload: { accessCode: string; nextPlayer: Player }) {
        this.logger.log(`Received transition started event for game ${payload.accessCode}`);
        this.server.to(payload.accessCode).emit('transitionStarted', {
            nextPlayer: payload.nextPlayer,
            transitionDuration: 3,
        });
    }

    // peut-etre pas necessaire finalement, a voir si on veut garder le countdown pour la transition
    @OnEvent('game.transition.countdown')
    handleTransitionCountdown(payload: { accessCode: string; countdown: number }) {
        this.server.to(payload.accessCode).emit('transitionCountdown', {
            countdown: payload.countdown,
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

    @OnEvent('game.turn.timer')
    handleTimerUpdate(payload: { accessCode: string; timeLeft: number }) {
        this.server.to(payload.accessCode).emit('timerUpdate', {
            timeLeft: payload.timeLeft,
        });
    }

    @OnEvent('game.combat.started')
    handleCombatStarted(payload: { accessCode: string; attacker: Player; defender: Player; firstFighter: Player }) {
        this.logger.log(`Combat started in game ${payload.accessCode}`);
        this.server.to(payload.accessCode).emit('combatStarted', {
            attacker: payload.attacker,
            defender: payload.defender,
            firstFighter: payload.firstFighter,
        });
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
