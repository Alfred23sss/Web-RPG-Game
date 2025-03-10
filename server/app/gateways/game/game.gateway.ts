import { Player } from '@app/interfaces/Player';
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
    ) {}

    @SubscribeMessage(GameEvents.CreateGame)
    handleCreateGame(@ConnectedSocket() client: Socket, @MessageBody() payload: { accessCode: string }) {
        this.logger.log(payload.accessCode);
        const lobby = this.lobbyService.getLobby(payload.accessCode);
        const gameSession = this.gameSessionService.createGameSession(payload.accessCode, lobby.game);
        this.server.to(payload.accessCode).emit('gameStarted', { orderedPlayers: gameSession.turn.orderedPlayers });
        this.logger.log('game created emitted');
        // this.server.to(payload.accessCode).emit('turnStarted');
    }

    @SubscribeMessage(GameEvents.AbandonedGame)
    handleGameAbandoned(@ConnectedSocket() client: Socket, @MessageBody() payload: { player: Player; accessCode: string }) {
        this.logger.log(`Player ${payload.player.name} has abandoned game`);
        this.lobbyService.leaveLobby(payload.accessCode, payload.player.name);
        const playerAbandon = this.gameSessionService.handlePlayerAbandoned(payload.accessCode, payload.player.name);
        const lobby = this.lobbyService.getLobby(payload.accessCode);
        client.leave(payload.accessCode);
        this.logger.log(`Lobby ${lobby} has left lobby`);

        if (lobby.players.length <= 1) {
            // stop game session here
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
}
