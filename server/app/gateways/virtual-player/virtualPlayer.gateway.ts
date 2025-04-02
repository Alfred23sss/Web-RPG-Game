import { Behavior } from '@app/enums/enums';
import { Player } from '@app/model/database/player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerCreationService } from '@app/services/virtual-player-creation/virtualPlayerCreation.service';
import { Logger } from '@nestjs/common';
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { VirtualPlayerEvents } from './virtualPlayer.gateway.events';

@WebSocketGateway({ cors: true })
export class VirtualPlayerGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly logger: Logger,
        private readonly virtualPlayerService: VirtualPlayerCreationService,
    ) {}

    @SubscribeMessage(VirtualPlayerEvents.CreateVirtualPlayer)
    handleCreateVirtualPlayer(@MessageBody() data: { behavior: Behavior; accessCode: string }): void {
        const lobby = this.lobbyService.getLobby(data.accessCode);

        this.logger.log('Received request to create Virtual Player with behavior', data.behavior);

        this.virtualPlayerService.createVirtualPlayer(data.behavior, lobby);
        const avatars = this.virtualPlayerService.getUsedAvatars(lobby);

        this.server.to(data.accessCode).emit('updatePlayers', lobby.players);
        this.server.to(data.accessCode).emit('updateUnavailableOptions', { avatars });

        if (lobby.isLocked) {
            this.server.to(data.accessCode).emit('lobbyLocked', { accessCode: data.accessCode, isLocked: true });
        }
    }

    @SubscribeMessage(VirtualPlayerEvents.KickVirtualPlayer)
    handleKickVirtualPlayer(@MessageBody() data: { accessCode: string; player: Player }): void {
        const lobby = this.lobbyService.getLobby(data.accessCode);
        this.virtualPlayerService.kickVirtualPlayer(lobby, data.player);
        const avatars = this.virtualPlayerService.getUsedAvatars(lobby);

        this.logger.log(avatars);

        this.server.to(data.accessCode).emit('updatePlayers', lobby.players);
        this.server.to(data.accessCode).emit('updateUnavailableOptions', { avatars });
    }
}
