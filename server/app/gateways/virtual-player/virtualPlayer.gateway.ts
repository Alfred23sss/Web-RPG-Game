import { Behavior } from '@app/enums/enums';
import { Tile } from '@app/interfaces/Tile';
import { Player } from '@app/model/database/player';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerCreationService } from '@app/services/virtual-player-creation/virtualPlayerCreation.service';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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
        private readonly gameSessionService: GameSessionService,
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

    @OnEvent(VirtualPlayerEvents.VirtualPlayerMove)
    async handleVirtualPlayerMove(
        @MessageBody() data: { virtualPlayerTile: Tile; closestPlayerTile: Tile; movement: Tile[]; accessCode: string },
    ): Promise<void> {
        const virtualPlayer = data.virtualPlayerTile.player;
        try {
            await this.gameSessionService.updatePlayerPosition(data.accessCode, data.movement, virtualPlayer);
        } catch (error) {
            this.logger.error('Error updating virtual player position', error);
        }
    }
}
