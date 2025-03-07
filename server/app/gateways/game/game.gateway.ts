import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameEvents } from './game.gateway.events';

@WebSocketGateway({ cors: true })
export class GameGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly logger: Logger) {}

    @SubscribeMessage(GameEvents.AbandonedGame)
    handleGameAbandoned(@ConnectedSocket() client: Socket, @MessageBody() payload: { playerName: string; accessCode: string }) {
        this.logger.log(`Player ${payload.playerName} has abandoned game`);
        // Emit the 'game-abandoned' event to notify clients
        this.server.to(payload.accessCode).emit('game-abandoned', { playerName: payload.playerName });
        this.logger.log('game abandoned emitted');
    }
}
