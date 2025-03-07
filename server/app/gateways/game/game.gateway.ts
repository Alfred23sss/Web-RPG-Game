import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GameEvents } from './game.gateway.events';

@WebSocketGateway({ cors: true })
export class GameGateway {
    private readonly logger = new Logger(GameGateway.name);

    @SubscribeMessage(GameEvents.AbandonedGame)
    handleGameAbandoned(@ConnectedSocket() client: Socket, @MessageBody() payload: { playerName: string }) {
        this.logger.log(`Player ${payload.playerName} has abandoned game`);
        // Emit the 'game-abandoned' event to notify clients
        client.emit('game-abandoned', { playerName: payload.playerName });
        this.logger.log('game abandoned emitted');
    }
}
