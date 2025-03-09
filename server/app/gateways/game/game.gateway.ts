import { Player } from '@app/interfaces/Player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
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
    ) {}

    @SubscribeMessage(GameEvents.AbandonedGame)
    handleGameAbandoned(@ConnectedSocket() client: Socket, @MessageBody() payload: { player: Player; accessCode: string }) {
        this.logger.log(`Player ${payload.player.name} has abandoned game`);
        this.lobbyService.leaveLobby(payload.accessCode, payload.player.name);
        const lobby = this.lobbyService.getLobby(payload.accessCode);
        client.leave(payload.accessCode);

        if (lobby.players.length <= 1) {
            this.server.to(payload.accessCode).emit('gameDeleted');
        }
        this.server.to(payload.accessCode).emit('game-abandoned', { player: payload.player });
        this.logger.log('game abandoned emitted');
    }
}
