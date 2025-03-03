import { Player } from '@app/interfaces/Player';
import { WaitingLineService } from '@app/services/waiting-line/waiting-line.service';
import { Injectable, Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DELAY_BEFORE_EMITTING_TIME, PRIVATE_ROOM_ID, WORD_MIN_LENGTH } from './chat.gateway.constants';
import { ChatEvents } from './chat.gateway.events';
@WebSocketGateway({ cors: true })
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer() private server: Server;

    private readonly room = PRIVATE_ROOM_ID;

    constructor(
        private readonly logger: Logger,
        private readonly waitingLineService: WaitingLineService,
    ) {}

    @SubscribeMessage(ChatEvents.Validate)
    validate(socket: Socket, word: string) {
        socket.emit(ChatEvents.WordValidated, word?.length > WORD_MIN_LENGTH);
    }

    @SubscribeMessage(ChatEvents.ValidateACK)
    validateWithAck(_: Socket, word: string) {
        return { isValid: word?.length > WORD_MIN_LENGTH };
    }

    @SubscribeMessage(ChatEvents.Create)
    createRoom(socket: Socket, room: string) {
        socket.join(room);
        this.logger.log(`Room created : ${room}`);
        this.server.to(room).emit('roomCreated', `Room ${room} created and joined by ${socket.id}`);
    }

    @SubscribeMessage(ChatEvents.BroadcastAll)
    broadcastAll(socket: Socket, message: string) {
        this.server.emit(ChatEvents.MassMessage, `${socket.id} : ${message}`);
    }

    @SubscribeMessage(ChatEvents.Broadcast)
    broadcast(socket: Socket, message: string) {
        socket.broadcast.emit(ChatEvents.MassMessage, `${socket.id} : ${message}`);
    }

    @SubscribeMessage(ChatEvents.JoinRoom)
    joinRoom(socket: Socket, room: string) {
        socket.join(room);
        socket.emit('joinedRoom', `You have joined room ${room}`);
    }

    @SubscribeMessage(ChatEvents.RoomMessage)
    roomMessage(@ConnectedSocket() socket: Socket, @MessageBody() data: { room: string; message: string }) {
        const { room, message } = data;

        // Vérifier si le socket est bien dans la salle avant d'envoyer le message
        if (socket.rooms.has(room)) {
            socket.broadcast.to(room).emit(ChatEvents.RoomMessage, `${socket.id} : ${message}`);
            console.log(`Message envoyé dans la salle ${room} sauf à ${socket.id}: ${message}`);
        } else {
            console.warn(`Socket ${socket.id} a tenté d'envoyer un message dans ${room} sans y être.`);
        }
    }

    // @SubscribeMessage(ChatEvents.AddToWaitingLine)
    // addToWaitingLine(socket: Socket, player: Player) {
    //     this.waitingLineService.addPlayer(player);
    //     this.server.emit('waitingLineUpdated', this.waitingLineService.getWaitingLine());
    // }

    // @SubscribeMessage(ChatEvents.RemoveFromWaitingLine)
    // removeFromWaitingLine(socket: Socket, playerId: string) {
    //     this.waitingLineService.removePlayer(playerId);
    //     this.server.emit('waitingLineUpdated', this.waitingLineService.getWaitingLine());
    // }

    @SubscribeMessage(ChatEvents.LeaveRoom)
    leaveRoom(socket: Socket, room: string) {
        socket.leave(room);
        this.logger.log(`Socket ${socket.id} left room: ${room}`);
        socket.emit('leftRoom', `You have left room ${room}`);
    }

    @SubscribeMessage(ChatEvents.DeleteRoom)
    deleteRoom(socket: Socket, room: string) {
        const roomSockets = this.server.sockets.adapter.rooms.get(room);
        if (roomSockets) {
            this.server.to(room).emit('roomDeleted', `Room ${room} has been deleted.`);

            roomSockets.forEach((socketId) => {
                const clientSocket = this.server.sockets.sockets.get(socketId);
                if (clientSocket) {
                    clientSocket.leave(room);
                    clientSocket.emit('leftRoom', `You have been removed from room ${room}.`);
                }
            });

            this.logger.log(`Room ${room} has been deleted.`);
        } else {
            this.logger.warn(`Attempted to delete non-existent room: ${room}`);
            socket.emit('error', `Room ${room} does not exist.`);
        }
    }

    afterInit() {
        setInterval(() => {
            this.emitTime();
        }, DELAY_BEFORE_EMITTING_TIME);
    }

    handleConnection(socket: Socket) {
        this.logger.log(`Connexion par l'utilisateur avec id : ${socket.id}`);
        // message initial
        socket.emit(ChatEvents.Hello, 'Hello World!');
    }

    handleDisconnect(socket: Socket) {
        this.logger.log(`Déconnexion par l'utilisateur avec id : ${socket.id}`);
    }

    private emitTime() {
        this.server.emit(ChatEvents.Clock, new Date().toLocaleTimeString());
    }
}
