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
import { LobbyEvents } from './lobby.gateway.events';

@WebSocketGateway({ cors: true })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly logger: Logger,
        private readonly accessCodesService: AccessCodesService,
    ) {}
    

    @SubscribeMessage('requestUnavailableOptions')
    handleRequestUnavailableOptions(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
        const updatedUnavailableOptions = this.lobbyService.getUnavailableNamesAndAvatars(accessCode);

        client.emit('updateUnavailableOptions', updatedUnavailableOptions);
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

        const success = this.lobbyService.joinLobby(accessCode, player);
        if (success) {
            // if(this.lobbyService.isNameTaken){
            //     player.name = this.generateUniqueName(lobby, player.name);
            // }
            client.join(accessCode);
            this.logger.log(`Player ${player.name} joined lobby ${accessCode}`);
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
            client.emit('joinedLobby'); // prq ca?

            if (lobby.players.length >= lobby.maxPlayers) {
                this.server.to(accessCode).emit('lobbyLocked', { accessCode, isLocked: true });
            }
        } else {
            client.emit('joinError', 'Unable to join lobby');
        }
    }

    @SubscribeMessage(LobbyEvents.DeleteLobby)
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

    @SubscribeMessage(LobbyEvents.LeaveLobby)
    handleLeaveLobby(@MessageBody() data: { accessCode: string; playerName: string }, @ConnectedSocket() client: Socket) {
        const { accessCode, playerName } = data;
        client.leave(accessCode);
        const isLobbyDeleted = this.lobbyService.leaveLobby(accessCode, playerName);

        if (isLobbyDeleted) {
            this.server.to(accessCode).emit('lobbyDeleted');
        } else {
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));

            const lobby = this.lobbyService.getLobby(accessCode);
            if (lobby && lobby.players.length < lobby.maxPlayers) {
                this.server.to(accessCode).emit('lobbyUnlocked', { accessCode, isLocked: false });
            }
        }
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

    // @SubscribeMessage('selectAvatar')
    // handleSelectAvatar(
    //     @MessageBody() data: { accessCode: string; avatar: string },
    //     @ConnectedSocket() client: Socket,
    // ) {
    //     const { accessCode, avatar } = data;
    //     const lobby = this.lobbyService.getLobby(accessCode);
    
    //     if (!lobby) {
    //         client.emit('error', 'Lobby not found');
    //         return;
    //     }
    //     const isAvatarTaken = lobby.waitingPlayers.some((wp) => wp.avatar === avatar);
    //     if (isAvatarTaken) {
    //         client.emit('error', 'Cet avatar est déjà pris !');
    //         return;
    //     }
    
    //     lobby.waitingPlayers.push({ socketId: client.id, avatar });
    //     this.server.to(accessCode).emit('updateUnavailableOptions', {
    //         names: lobby.players.map((p) => p.name),
    //         avatars: lobby.waitingPlayers.map((wp) => wp.avatar),
    //     });
    //     client.emit('avatarSelected', { avatar });
    // }
    @SubscribeMessage('selectAvatar')
    handleSelectAvatar(
    @MessageBody() data: { accessCode: string; avatar: string },
    @ConnectedSocket() client: Socket,
) {
    const { accessCode, avatar } = data;
    const lobby = this.lobbyService.getLobby(accessCode);

    if (!lobby) {
        client.emit('error', 'Lobby not found');
        return;
    }//push DANS PLAYERS PAS WAITING PLAYERS
    lobby.waitingPlayers = lobby.waitingPlayers.filter((wp) => wp.socketId !== client.id);

    const isAvatarTaken = lobby.waitingPlayers.some((wp) => wp.avatar === avatar);
    if (isAvatarTaken) {
        client.emit('error', 'Cet avatar est déjà pris !');
        return;
    }
    
    lobby.waitingPlayers.push({ socketId: client.id, avatar });
    console.log(`🚀 Mise à jour waitingPlayers après sélection :`, lobby.waitingPlayers);

    console.log(`🔄 Envoi de updateUnavailableOptions avec avatars :`, 
    lobby.waitingPlayers.map((wp) => wp.avatar)
    );
    
    this.server.to(accessCode).emit('updateUnavailableOptions', { names: lobby.players.map((p) => p.name),avatars: lobby.waitingPlayers.map((wp) => wp.avatar),
    });
    client.emit('avatarSelected', { avatar });
}
    
    // @SubscribeMessage('deselectAvatar')
    // handleDeselectAvatar(
    //     @MessageBody() accessCode: string,
    //     @ConnectedSocket() client: Socket,
    // ) {
    //     const lobby = this.lobbyService.getLobby(accessCode);
    
    //     if (!lobby) {
    //         client.emit('error', 'Lobby not found');
    //         return;
    //     }
    //     lobby.waitingPlayers = lobby.waitingPlayers.filter((wp) => wp.socketId !== client.id);
    //     this.server.to(accessCode).emit('updateUnavailableOptions', {
    //         names: lobby.players.map((p) => p.name),
    //         avatars: lobby.waitingPlayers.map((wp) => wp.avatar),
    //     });
    //     client.emit('avatarDeselected');
    // }
    @SubscribeMessage('deselectAvatar')
    handleDeselectAvatar(
    @MessageBody() accessCode: string,
    @ConnectedSocket() client: Socket,
) {
    const lobby = this.lobbyService.getLobby(accessCode);
    if (!lobby) {
        client.emit('error', 'Lobby not found');
        return;
    }

    lobby.waitingPlayers = lobby.waitingPlayers.filter((wp) => wp.socketId !== client.id);
    console.log(`❌ Mise à jour waitingPlayers après désélection :`, lobby.waitingPlayers);

    console.log(`🔄 Envoi de updateUnavailableOptions avec avatars :`, 
        lobby.waitingPlayers.map((wp) => wp.avatar)
    );
    
    this.server.to(accessCode).emit('updateUnavailableOptions', {
        names: lobby.players.map((p) => p.name),
        avatars: lobby.waitingPlayers.map((wp) => wp.avatar),
    });
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
        this.logger.log(`User disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(@MessageBody() accessCode: string, @ConnectedSocket() client: Socket) {
    const lobby = this.lobbyService.getLobby(accessCode);
    if (!lobby) {
        client.emit('error', 'Lobby not found');
        return;
    }

    client.join(accessCode);
    console.log(`✅ Client ${client.id} a rejoint la room ${accessCode} immédiatement en ouvrant le formulaire.`);

    const updatedUnavailableOptions = this.lobbyService.getUnavailableNamesAndAvatars(accessCode);
    this.server.to(client.id).emit('updateUnavailableOptions', updatedUnavailableOptions);
}



}
