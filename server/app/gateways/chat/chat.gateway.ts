import { Injectable } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DELAY_BEFORE_EMITTING_TIME, WORD_MIN_LENGTH } from './chat.gateway.constants';
import { ChatEvents } from './chat.gateway.events';

@WebSocketGateway({ cors: true })
@Injectable()
export class ChatGateway implements OnGatewayInit {
    @WebSocketServer() private server: Server;

    @SubscribeMessage(ChatEvents.Validate)
    validate(socket: Socket, word: string) {
        socket.emit(ChatEvents.WordValidated, word?.length > WORD_MIN_LENGTH);
    }

    @SubscribeMessage(ChatEvents.ValidateACK)
    validateWithAck(_: Socket, word: string) {
        return { isValid: word?.length > WORD_MIN_LENGTH };
    }

    @SubscribeMessage(ChatEvents.BroadcastAll)
    broadcastAll(socket: Socket, message: string) {
        this.server.emit(ChatEvents.MassMessage, `${socket.id} : ${message}`);
    }

    @SubscribeMessage(ChatEvents.RoomMessage)
    roomMessage(_: Socket, payload: { message: string; author: string; room: string }) {
        const { message, room, author } = payload;
        if (!room) return;
        if (this.server.sockets.adapter.rooms.has(room)) {
            const formattedMessage = this.formatMessage(author, message);
            this.server.to(room).emit(ChatEvents.RoomMessage, formattedMessage);
        }
    }

    afterInit() {
        setInterval(() => {
            this.emitTime();
        }, DELAY_BEFORE_EMITTING_TIME);
    }

    private emitTime() {
        this.server.emit(ChatEvents.Clock, new Date().toLocaleTimeString());
    }

    private formatMessage(author: string, message: string): string {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: false });
        return `${author}: ${message} - ${timeString}`;
    }
}
