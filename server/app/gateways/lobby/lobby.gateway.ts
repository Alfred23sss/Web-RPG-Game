import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LobbyEvents } from './lobby.gateway.events';
@WebSocketGateway({ cors: true })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly accessCodesService: AccessCodesService,
        private readonly gameSessionService: GameSessionService,
        private readonly gameCombatService: GameCombatService,
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
        client.emit('updateUnavailableOptions', unavailableAvatars);
    }

    @SubscribeMessage(LobbyEvents.CreateLobby)
    handleCreateLobby(@MessageBody() data: { game: Game }, @ConnectedSocket() client: Socket) {
        const { game } = data;
        const accessCode = this.lobbyService.createLobby(game);
        client.join(accessCode);
        this.lobbyService.addPlayerToRoom(client.id, accessCode);
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
        const success = this.lobbyService.joinLobby(accessCode, player).success;
        if (success) {
            this.lobbyService.addPlayerToRoom(client.id, accessCode);
            client.join(accessCode);
            this.lobbyService.setPlayerSocket(player.name, client.id);
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
            client.emit('joinedLobby');

            if (lobby.players.length >= lobby.maxPlayers) {
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
        this.lobbyService.addPlayerToRoom(client.id, accessCode);
        client.join(accessCode);
        lobby.waitingPlayers = lobby.waitingPlayers.filter((wp) => this.server.sockets.sockets.has(wp.socketId));
        const unavailableAvatars = [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];
        this.server.to(client.id).emit('updateUnavailableOptions', { avatars: unavailableAvatars });
    }

    @SubscribeMessage('kickPlayer')
    handleKickPlayer(@MessageBody() data: { accessCode: string; playerName: string }) {
        const kickedPlayerSocketId = this.lobbyService.getPlayerSocket(data.playerName);
        if (kickedPlayerSocketId) {
            const kickedSocket = this.server.sockets.sockets.get(kickedPlayerSocketId);
            if (kickedSocket) {
                this.handlePlayerDisconnect(kickedSocket);
            }
            this.server.to(kickedPlayerSocketId).emit('kicked', { accessCode: data.accessCode, playerName: data.playerName });
            this.lobbyService.removePlayerSocket(data.playerName);
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
        const lobby = this.lobbyService.getLobby(accessCode);
        if (lobby) {
            client.emit('updateLobby', lobby);
        } else {
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

    @SubscribeMessage('manualDisconnect')
    handleManualDisconnect(@ConnectedSocket() client: Socket, @MessageBody() data: { isInGame: boolean } = { isInGame: false }) {
        this.handlePlayerDisconnect(client, data.isInGame);
    }

    handleConnection(@ConnectedSocket() socket: Socket) {
        const accessCode = this.lobbyService.getLobbyIdByPlayer(socket.id);

        if (accessCode) {
            socket.join(accessCode);
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
        }
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        const accessCode = this.lobbyService.getRoomForPlayer(client.id);
        const isInGame = this.gameSessionService.getGameSession(accessCode) !== undefined;
        this.handlePlayerDisconnect(client, isInGame);
    }

    private handlePlayerDisconnect(client: Socket, isInGame: boolean = false) {
        const accessCode = this.lobbyService.getRoomForPlayer(client.id);
        const player = this.lobbyService.getPlayerBySocketId(client.id);
        if (!player) {
            this.handleFormDisconnect(client);
            return;
        }
        if (isInGame) {
            this.handleGamePlayerDisconnect(accessCode, player.name, client);
        } else {
            this.handleLobbyPlayerDisconnect(accessCode, player.name, client.id);
        }
        this.server.to(client.id).emit('updateUnavailableOptions', { avatars: [] });
        client.leave(accessCode);
        this.lobbyService.removePlayerSocket(client.id);
    }

    private handleGamePlayerDisconnect(accessCode: string, playerName: string, client: Socket) {
        const playerAbandon = this.gameSessionService.getPlayers(accessCode).find((p) => p.name === playerName);
        this.gameSessionService.handlePlayerItemReset(accessCode, playerAbandon);
        this.gameCombatService.handleCombatSessionAbandon(accessCode, playerName);
        this.gameSessionService.handlePlayerAbandoned(accessCode, playerName);
        this.lobbyService.leaveLobby(accessCode, playerName, true);
        const lobby = this.lobbyService.getLobby(accessCode);
        const areAllVirtual = lobby.players.every((player) => player.isVirtual);
        if ((lobby && lobby.players.length <= 1) || areAllVirtual) {
            this.lobbyService.clearLobby(accessCode);
            this.gameSessionService.deleteGameSession(accessCode);
            this.accessCodesService.removeAccessCode(accessCode);
            this.server.to(accessCode).emit('gameDeleted');
            this.server.to(accessCode).emit('updateUnavailableOptions', { avatars: [] });
        }
        this.server.to(client.id).emit('updateUnavailableOptions', { avatars: [] });
        this.server.to(accessCode).emit('game-abandoned', { player: playerAbandon });
    }

    private handleLobbyPlayerDisconnect(accessCode: string, playerName: string, clientId: string) {
        const isAdminLeaving = this.lobbyService.isAdminLeaving(accessCode, playerName);
        if (isAdminLeaving) {
            this.server.to(accessCode).emit('adminLeft', {
                playerSocketId: clientId,
                message: "L'admin a quitté la partie, le lobby est fermé.",
            });
        }
        const isLobbyDeleted = this.lobbyService.leaveLobby(accessCode, playerName);
        const lobby = this.lobbyService.getLobby(accessCode);
        if (lobby) {
            lobby.waitingPlayers = lobby.waitingPlayers.filter((wp) => wp.socketId !== clientId);
        }
        if (isLobbyDeleted) {
            this.server.to(accessCode).emit('lobbyDeleted');
            this.server.to(accessCode).emit('updateUnavailableOptions', { avatars: [] });
        } else if (lobby) {
            const unavailableAvatars = [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];
            this.server.to(accessCode).emit('updateUnavailableOptions', { avatars: unavailableAvatars });
            this.server.to(accessCode).emit('updatePlayers', this.lobbyService.getLobbyPlayers(accessCode));
        }
    }

    private async handleFormDisconnect(client: Socket) {
        const accessCode = this.lobbyService.getRoomForPlayer(client.id);
        if (!accessCode) return;
        const lobby = this.lobbyService.getLobby(accessCode);
        if (!lobby) return;
        const waitingPlayerIndex = lobby.waitingPlayers.findIndex((wp) => wp.socketId === client.id);
        if (waitingPlayerIndex === -1) return;
        lobby.waitingPlayers.splice(waitingPlayerIndex, 1);
        const unavailableAvatars = [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];
        this.server.to(accessCode).emit('updateUnavailableOptions', {
            avatars: unavailableAvatars,
        });
        client.leave(accessCode);
        this.lobbyService.removePlayerSocket(client.id);
    }
}
