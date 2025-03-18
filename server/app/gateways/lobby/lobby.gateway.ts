import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
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
import { LobbyEvents } from './lobby.gateway.events';

@WebSocketGateway({ cors: true })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly logger: Logger,
    ) {}

    @SubscribeMessage('requestUnavailableOptions')
    handleRequestUnavailableOptions(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(accessCode);

        if (!lobby) {
            client.emit('error', 'Lobby not found');
            return;
        }

        const unavailableAvatars = [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];

        this.server.to(accessCode).emit('updateUnavailableOptions', { avatars: unavailableAvatars });
        client.emit('updateUnavailableOptions', unavailableAvatars); // ????
    }

    @SubscribeMessage(LobbyEvents.CreateLobby)
    handleCreateLobby(@MessageBody() data: { game: Game }, @ConnectedSocket() client: Socket) {
        const { game } = data;
        const accessCode = this.lobbyService.createLobby(game);
        client.join(accessCode);
        this.logger.log(`Lobby created with game: ${game.name} and accessCode: ${accessCode}`);
        client.emit('lobbyCreated', { accessCode });
    }

    @SubscribeMessage(LobbyEvents.JoinLobby)
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
        // changement ajout de .success
        const success = this.lobbyService.joinLobby(accessCode, player).success;
        if (success) {
            client.join(accessCode);
            this.logger.log(`Player ${player.name} joined lobby ${accessCode}`);

            this.lobbyService.setPlayerSocket(player.name, client.id);

            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
            client.emit('joinedLobby');

            if (lobby.isLocked) {
                this.server.to(accessCode).emit('lobbyLocked', { accessCode, isLocked: true });
            }
        } else {
            client.emit('joinError', 'Unable to join lobby');
        }
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) {
            client.emit('error', 'Lobby not found');
            return;
        }

        client.join(accessCode);
        const unavailableAvatars = [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];

        this.server.to(client.id).emit('updateUnavailableOptions', { avatars: unavailableAvatars });
    }

    @SubscribeMessage(LobbyEvents.LeaveLobby)
    handleLeaveLobby(@MessageBody() data: { accessCode: string; playerName: string }, @ConnectedSocket() client: Socket) {
        const { accessCode, playerName } = data;

        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) return;
        const isAdminLeaving = this.lobbyService.isAdminLeaving(accessCode, playerName);
        if (isAdminLeaving) {
            this.server.to(accessCode).emit('adminLeft', { playerSocketId: client.id, message: "L'admin a quitté la partie, le lobby est fermé." });
        }
        const isLobbyDeleted = this.lobbyService.leaveLobby(accessCode, playerName);
        lobby.waitingPlayers = lobby.waitingPlayers.filter((wp) => wp.socketId !== client.id);

        if (isLobbyDeleted) {
            this.server.to(accessCode).emit('lobbyDeleted');
            this.server.to(accessCode).emit('updateUnavailableOptions', { avatars: [] });
        } else {
            const unavailableAvatars = [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];
            this.server.to(accessCode).emit('updateUnavailableOptions', { avatars: unavailableAvatars });
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
            this.server.to(client.id).emit('updateUnavailableOptions', { avatars: [] });
        }

        client.leave(accessCode);
    }

    @SubscribeMessage('kickPlayer')
    handleKickPlayer(@MessageBody() data: { accessCode: string; playerName: string }) {
        this.logger.log(`Admin requested to kick player ${data.playerName} from lobby ${data.accessCode}`);

        const kickedPlayerSocketId = this.lobbyService.getPlayerSocket(data.playerName);
        if (kickedPlayerSocketId) {
            const kickedSocket = this.server.sockets.sockets.get(kickedPlayerSocketId);
            if (kickedSocket) {
                this.handleLeaveLobby(data, kickedSocket);
            }
            this.server.to(kickedPlayerSocketId).emit('kicked', { accessCode: data.accessCode, playerName: data.playerName });
            this.lobbyService.removePlayerSocket(data.playerName);
        }

        this.logger.log(`Player ${data.playerName} was kicked from lobby ${data.accessCode}`);
    }

    @SubscribeMessage(LobbyEvents.GetLobbyPlayers)
    handleGetLobbyPlayers(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const players = this.lobbyService.getLobbyPlayers(accessCode);
        if (players) {
            client.emit('updatePlayers', players);
        } else {
            client.emit('error', 'Lobby not found');
        }
    }

    @SubscribeMessage(LobbyEvents.GetLobby)
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

    @SubscribeMessage(LobbyEvents.LockLobby)
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

    // @SubscribeMessage(LobbyEvents.AlertGameStarted)
    // handleAlertGameStarted(@MessageBody() accessCode: string) {
    //     this.server.to(accessCode).emit('gameStarted');
    //     this.logger.log(`Game started for lobby ${accessCode}`);
    // }

    @SubscribeMessage(LobbyEvents.UnlockLobby)
    handleUnlockLobby(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) {
            client.emit('error', 'Lobby not found');
            return;
        }

        if (lobby.players.length >= lobby.maxPlayers) {
            client.emit('error', 'Lobby is full and cannot be unlocked');
            return;
        }

        lobby.isLocked = false;
        this.logger.log(`Lobby ${accessCode} has been unlocked`);
        this.server.to(accessCode).emit('lobbyUnlocked', { accessCode, isLocked: false });
    }

    @SubscribeMessage('selectAvatar')
    handleSelectAvatar(@MessageBody() data: { accessCode: string; avatar: string }, @ConnectedSocket() client: Socket) {
        const { accessCode, avatar } = data;
        const lobby = this.lobbyService.getLobby(accessCode);

        if (!lobby) {
            client.emit('error', 'Lobby not found');
            return;
        }

        lobby.waitingPlayers = lobby.waitingPlayers.filter((wp) => wp.socketId !== client.id);

        const isAvatarTaken = lobby.players.some((p) => p.avatar === avatar) || lobby.waitingPlayers.some((wp) => wp.avatar === avatar);

        if (isAvatarTaken) {
            client.emit('error', 'Cet avatar est déjà pris !');
            return;
        }

        lobby.waitingPlayers.push({ socketId: client.id, avatar });

        const unavailableAvatars = [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];

        this.server.to(accessCode).emit('updateUnavailableOptions', { avatars: unavailableAvatars });
        client.emit('avatarSelected', { avatar });
    }

    @SubscribeMessage('deselectAvatar')
    handleDeselectAvatar(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) {
            client.emit('error', 'Lobby not found');
            return;
        }

        lobby.waitingPlayers = lobby.waitingPlayers.filter((wp) => wp.socketId !== client.id);

        const unavailableAvatars = [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];

        this.server.to(accessCode).emit('updateUnavailableOptions', { avatars: unavailableAvatars });
        client.emit('avatarDeselected');
    }

    afterInit() {
        this.logger.log('LobbyGateway initialized.');
    }

    handleConnection(@ConnectedSocket() socket: Socket) {
        this.logger.log(`User connected: ${socket.id}`);
        const accessCode = this.lobbyService.getLobbyIdByPlayer(socket.id);

        if (accessCode) {
            socket.join(accessCode);
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
        }
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        const accessCode = this.lobbyService.getLobbyIdByPlayer(client.id);
        if (accessCode) {
            this.lobbyService.leaveLobby(accessCode, client.id);
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
        }
        this.lobbyService.removePlayerSocket(client.id);
        this.logger.log(`User disconnected: ${client.id}`);
    }
}
