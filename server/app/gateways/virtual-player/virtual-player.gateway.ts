import { ACTION_MAX_MS } from '@app/constants/constants';
import { EventEmit } from '@app/enums/enums';
import { Item } from '@app/interfaces/item';
import { Tile } from '@app/interfaces/tile';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { Player } from '@app/model/database/player';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerCreationService } from '@app/services/virtual-player-creation/virtual-player-creation.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { Behavior } from '@common/enums';
import { OnEvent } from '@nestjs/event-emitter';
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { VirtualPlayerEvents } from './virtual-player.gateway.events';

@WebSocketGateway({ cors: true })
export class VirtualPlayerGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly virtualPlayerCreationService: VirtualPlayerCreationService,
        private readonly virtualPlayerService: VirtualPlayerService,
        private readonly gameSessionService: GameSessionService,
        private readonly gameStatistics: GameStatisticsService,
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
        await this.gameSessionService.updatePlayerPosition(data.accessCode, data.movement, virtualPlayer);
    }

    @OnEvent(VirtualPlayerEvents.EndVirtualPlayerTurn)
    handleEndVirtualPlayerTurn(@MessageBody() data: { accessCode: string }) {
        this.virtualPlayerService.resetStats();
        setTimeout(() => {
            this.gameSessionService.endTurn(data.accessCode);
        }, ACTION_MAX_MS);
    }

    @OnEvent(VirtualPlayerEvents.ChooseItem)
    handleItemChoice(@MessageBody() data: { accessCode: string; player: VirtualPlayer; items: Item[]; itemPickUp: Item }) {
        const removedItem = this.virtualPlayerService.itemChoice(data.player.behavior, data.items);
        if (removedItem.name === data.itemPickUp.name) {
            this.gameStatistics.decrementItem(data.accessCode, data.itemPickUp, data.player);
        }
        this.gameSessionService.handleItemDropped(data.accessCode, data.player, removedItem);
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
        this.virtualPlayerService.delay(accessCode);
    }
}
