import { Behavior, EventEmit } from '@app/enums/enums';
import { Item } from '@app/interfaces/Item';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { Player } from '@app/model/database/player';
import { GameModeSelectorService } from '@app/services/game-mode-selector/game-mode-selector.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerCreationService } from '@app/services/virtual-player-creation/virtualPlayerCreation.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtualPlayer.service';
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
        private readonly virtualPlayerCreationService: VirtualPlayerCreationService,
        private readonly virtualPlayerService: VirtualPlayerService,
        private readonly gameModeSelector: GameModeSelectorService,
    ) {}

    @SubscribeMessage(VirtualPlayerEvents.CreateVirtualPlayer)
    handleCreateVirtualPlayer(@MessageBody() data: { behavior: Behavior; accessCode: string }): void {
        const lobby = this.lobbyService.getLobby(data.accessCode);
        this.virtualPlayerCreationService.createVirtualPlayer(data.behavior, lobby);
        const avatars = this.virtualPlayerCreationService.getUsedAvatars(lobby);
        this.server.to(data.accessCode).emit('updatePlayers', lobby.players);
        this.server.to(data.accessCode).emit('updateUnavailableOptions', { avatars });
        if (lobby.isLocked) {
            this.server.to(data.accessCode).emit('lobbyLocked', { accessCode: data.accessCode, isLocked: true });
        }
    }

    @SubscribeMessage(VirtualPlayerEvents.KickVirtualPlayer)
    handleKickVirtualPlayer(@MessageBody() data: { accessCode: string; player: Player }): void {
        const lobby = this.lobbyService.getLobby(data.accessCode);
        this.virtualPlayerCreationService.kickVirtualPlayer(lobby, data.player);
        const avatars = this.virtualPlayerCreationService.getUsedAvatars(lobby);
        this.server.to(data.accessCode).emit('updatePlayers', lobby.players);
        this.server.to(data.accessCode).emit('updateUnavailableOptions', { avatars });
    }

    @OnEvent(VirtualPlayerEvents.VirtualPlayerMove)
    async handleVirtualPlayerMove(
        @MessageBody() data: { virtualPlayerTile: Tile; closestPlayerTile: Tile; movement: Tile[]; accessCode: string },
    ): Promise<void> {
        const virtualPlayer = data.virtualPlayerTile.player;
        try {
            const gameService = this.gameModeSelector.getServiceByAccessCode(data.accessCode);
            await gameService.updatePlayerPosition(data.accessCode, data.movement, virtualPlayer);
        } catch (error) {
            this.logger.error('Error updating virtual player position', error);
        }
    }

    @OnEvent(VirtualPlayerEvents.EndVirtualPlayerTurn)
    handleEndVirtualPlayerTurn(@MessageBody() data: { accessCode: string }) {
        this.logger.log('Ending turn for VirtualPlayer for game', data.accessCode);

        this.virtualPlayerService.resetStats();
        const gameService = this.gameModeSelector.getServiceByAccessCode(data.accessCode);
        gameService.endTurn(data.accessCode);
    }

    @OnEvent(VirtualPlayerEvents.ChooseItem)
    handleItemChoice(@MessageBody() data: { accessCode: string; player: VirtualPlayer; items: Item[] }) {
        const removedItem = this.virtualPlayerService.itemChoice(data.player.behavior, data.items);
        const gameService = this.gameModeSelector.getServiceByAccessCode(data.accessCode);
        gameService.handleItemDropped(data.accessCode, data.player, removedItem);
    }

    @OnEvent(EventEmit.GameTurnStarted)
    handleVirtualPlayerTurnStarted(@MessageBody() data: { accessCode: string; player: VirtualPlayer }) {
        this.virtualPlayerService.handleTurnStart(data.accessCode, data.player);
    }

    @OnEvent(EventEmit.GameCombatTurnStarted)
    handleCombatTurnStarted(@MessageBody() data: { accessCode: string; player: VirtualPlayer }) {
        this.virtualPlayerService.handleCombatTurnStart(data.accessCode, data.player);
    }

    @OnEvent(EventEmit.VPActionDone)
    handleActionDone(@MessageBody() accessCode: string) {
        console.log('starting another turn behavior');
        this.virtualPlayerService.delay(accessCode);
    }
}
