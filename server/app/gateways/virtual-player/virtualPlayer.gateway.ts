import { Behavior } from '@app/enums/enums';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtualPlayer.service';
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
        private readonly virtualPlayerService: VirtualPlayerService,
    ) {}

    @SubscribeMessage(VirtualPlayerEvents.CreateVirtualPlayer)
    handleCreateVirtualPlayer(@MessageBody() data: { behavior: Behavior; accessCode: string }): void {
        const lobby = this.lobbyService.getLobby(data.accessCode);

        this.logger.log('Received request to create Virtual Player with behavior', data.behavior);

        this.virtualPlayerService.createVirtualPlayer(data.behavior, lobby);
        this.server.to(data.accessCode).emit('updatePlayers', lobby.players);

        if (lobby.isLocked) {
            this.server.to(data.accessCode).emit('lobbyLocked', { accessCode: data.accessCode, isLocked: true });
        }
    }
}
