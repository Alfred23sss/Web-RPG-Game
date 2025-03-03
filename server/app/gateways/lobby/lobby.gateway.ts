import { Player } from '@app/model/player/player.model';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class LobbyGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly logger: Logger,
    ) {}

    @SubscribeMessage('createLobby')
    handleCreateLobby(@MessageBody() lobbyId: string, @ConnectedSocket() client: Socket) {
        this.lobbyService.createLobby(lobbyId);
        client.join(lobbyId);
        this.logger.log(`Lobby created: ${lobbyId}`);
        this.server.to(lobbyId).emit('lobbyCreated', this.lobbyService.getLobbyPlayers(lobbyId));
    }

    @SubscribeMessage('joinLobby')
    handleJoinLobby(@MessageBody() data: { lobbyId: string; player: Player }, @ConnectedSocket() client: Socket) {
        const { lobbyId, player } = data;
        const success = this.lobbyService.joinLobby(lobbyId, player);

        if (success) {
            client.join(lobbyId);
            this.logger.log(`Player ${player.name} joined lobby ${lobbyId}`);
            this.server.to(lobbyId).emit('updatePlayers', this.lobbyService.getLobbyPlayers(lobbyId));
        } else {
            client.emit('joinError', 'Unable to join lobby');
        }
    }

    @SubscribeMessage('deleteLobby')
    deleteLobby(@MessageBody() lobbyId: string, @ConnectedSocket() client: Socket) {
        const roomSockets = this.server.sockets.adapter.rooms.get(lobbyId);
        if (roomSockets) {
            this.server.to(lobbyId).emit('lobbyDeleted');

            roomSockets.forEach((socketId) => {
                const clientSocket = this.server.sockets.sockets.get(socketId);
                if (clientSocket) {
                    clientSocket.leave(lobbyId);
                    clientSocket.emit('leftLobby');
                }
            });

            this.logger.log(`Lobby ${lobbyId} deleted.`);
        } else {
            this.logger.warn(`Attempted to delete non-existent lobby: ${lobbyId}`);
            client.emit('error', `Lobby ${lobbyId} does not exist.`);
        }
    }

    @SubscribeMessage('leaveLobby')
    handleLeaveLobby(@MessageBody() data: { lobbyId: string; playerName: string }, @ConnectedSocket() client: Socket) {
        const { lobbyId, playerName } = data;
        client.leave(lobbyId);
        this.lobbyService.leaveLobby(lobbyId, playerName);
        this.server.to(lobbyId).emit('updatePlayers', this.lobbyService.getLobbyPlayers(lobbyId));
        this.logger.log(`Player ${playerName} left lobby ${lobbyId}`);
    }

    @SubscribeMessage('getLobbyPlayers')
    handleGetLobbyPlayers(@MessageBody() lobbyId: string, @ConnectedSocket() client: Socket) {
        client.emit('updatePlayers', this.lobbyService.getLobbyPlayers(lobbyId));
    }

    afterInit() {
        this.logger.log('LobbyGateway initialized.');
    }

    handleDisconnect(client: Socket) {
        const lobbyId = this.lobbyService.getLobbyIdByPlayer(client.id);
        if (lobbyId) {
            this.lobbyService.leaveLobby(lobbyId, client.id);
            this.server.to(lobbyId).emit('updatePlayers', this.lobbyService.getLobbyPlayers(lobbyId));
        }
        this.logger.log(`User disconnected: ${client.id}`);
    }
}
