import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Logger } from '@nestjs/common';
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

@WebSocketGateway({ cors: true })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly logger: Logger,
        private readonly accessCodesService: AccessCodesService,
    ) {}

    @SubscribeMessage('createLobby')
    handleCreateLobby(@MessageBody() data: { game: Game }, @ConnectedSocket() client: Socket) {
        const { game } = data;
        const accessCode = this.lobbyService.createLobby(game);
        client.join(accessCode);
        this.logger.log(`Lobby created with game: ${game.name} and accessCode: ${accessCode}`);
        client.emit('lobbyCreated', { accessCode });
    }

    @SubscribeMessage('joinLobby')
    handleJoinLobby(@MessageBody() data: { accessCode: string; player: Player }, @ConnectedSocket() client: Socket) {
        const { accessCode, player } = data;

        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) {
            client.emit('error', 'Invalid access code');
            return;
        }

        if (lobby.isLocked) {
            client.emit('joinError', 'Lobby is locked and cannot be joined');
            return;
        }

        const success = this.lobbyService.joinLobby(accessCode, player);
        if (success) {
            client.join(accessCode);
            this.logger.log(`Player ${player.name} joined lobby ${accessCode}`);
            const updatedPlayer = this.lobbyService.getLobbyPlayers(accessCode);
            this.logger.log('Updated player list:', updatedPlayer);
            this.server.to(accessCode).emit('updatePlayers', updatedPlayer);
            client.emit('joinedLobby'); //prq ca?
        } else {
            client.emit('joinError', 'Unable to join lobby');
        }
    }

    @SubscribeMessage('deleteLobby')
    handleDeleteLobby(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) {
            client.emit('error', 'Lobby does not exist');
            return;
        }

        const roomSockets = this.server.sockets.adapter.rooms.get(accessCode);
        if (roomSockets) {
            this.server.to(accessCode).emit('lobbyDeleted');
            roomSockets.forEach((socketId) => {
                const clientSocket = this.server.sockets.sockets.get(socketId);
                if (clientSocket) {
                    clientSocket.leave(accessCode);
                    clientSocket.emit('leftLobby');
                }
            });

            this.lobbyService.leaveLobby(accessCode, '');
            this.logger.log(`Lobby ${accessCode} deleted.`);
        } else {
            client.emit('error', `Lobby ${accessCode} does not exist.`);
        }
    }

    @SubscribeMessage('leaveLobby')
    handleLeaveLobby(@MessageBody() data: { accessCode: string; playerName: string }, @ConnectedSocket() client: Socket) {
        const { accessCode, playerName } = data;
        client.leave(accessCode);
        const isLobbyDeleted = this.lobbyService.leaveLobby(accessCode, playerName);
        this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
        this.logger.log(`Player ${playerName} left lobby ${accessCode}`);
        if (isLobbyDeleted) {
            this.server.to(accessCode).emit('lobbyDeleted', this.lobbyService.getLobbyPlayers(accessCode));
        }
    }

    @SubscribeMessage('getLobbyPlayers')
    handleGetLobbyPlayers(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const players = this.lobbyService.getLobbyPlayers(accessCode);
        if (players) {
            client.emit('updatePlayers', players);
        } else {
            client.emit('error', 'Lobby not found');
        }
    }

    @SubscribeMessage('getLobby')
    handleGetLobby(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        this.logger.log(`Received getLobby request for accessCode: ${accessCode}`);
        const lobby = this.lobbyService.getLobby(accessCode);
        if (lobby) {
            this.logger.log(`Lobby found with code: ${JSON.stringify(lobby.accessCode)}`);
            client.emit('updateLobby', lobby);
        } else {
            this.logger.log(`Lobby not found for accessCode: ${accessCode}`);
            client.emit('error', 'Lobby not found');
        }
    }

    @SubscribeMessage('lockLobby')
    handleLockLobby(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) {
            client.emit('error', 'Lobby not found');
            return;
        }

        lobby.isLocked = true;
        this.logger.log(`Lobby ${accessCode} has been locked`);
        this.server.to(accessCode).emit('lobbyLocked', { accessCode, isLocked: true });
    }

    @SubscribeMessage('unlockLobby')
    handleUnlockLobby(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) {
            client.emit('error', 'Lobby not found');
            return;
        }

        lobby.isLocked = false;
        this.logger.log(`Lobby ${accessCode} has been unlocked`);
        this.server.to(accessCode).emit('lobbyUnlocked', { accessCode, isLocked: false });
    }

    afterInit() {
        this.logger.log('LobbyGateway initialized.');
    }

    handleConnection(@ConnectedSocket() socket: Socket) {
        this.logger.log(`User connected: ${socket.id}`);
        const accessCode = this.lobbyService.getLobbyIdByPlayer(socket.id);

        if (accessCode) {
            socket.join(accessCode);
            this.logger.log(`Player ${socket.id} rejoined lobby ${accessCode}`);
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
        } else {
            this.logger.log(`Player ${socket.id} has no lobby associated`);
        }
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        const accessCode = this.lobbyService.getLobbyIdByPlayer(client.id);
        if (accessCode) {
            this.lobbyService.leaveLobby(accessCode, client.id);
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
        }
        this.logger.log(`User disconnected: ${client.id}`);
    }
}
