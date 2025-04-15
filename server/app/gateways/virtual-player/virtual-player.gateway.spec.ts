/* eslint-disable @typescript-eslint/no-magic-numbers */ // approved by education team, disabling magic numbers in tests
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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { VirtualPlayerGateway } from './virtual-player.gateway';

describe('VirtualPlayerGateway', () => {
    let gateway: VirtualPlayerGateway;
    let mockServer: Partial<Server>;
    let mockLobbyService: Partial<LobbyService>;
    let mockVirtualPlayerCreationService: Partial<VirtualPlayerCreationService>;
    let mockVirtualPlayerService: Partial<VirtualPlayerService>;
    let mockGameSessionService: Partial<GameSessionService>;
    let mockGameStatisticsService: Partial<GameStatisticsService>;

    beforeEach(async () => {
        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        mockLobbyService = {
            getLobby: jest.fn(),
        };

        mockVirtualPlayerCreationService = {
            createVirtualPlayer: jest.fn(),
            getUsedAvatars: jest.fn(),
            kickVirtualPlayer: jest.fn(),
        };

        mockGameStatisticsService = {
            getGameStatistics: jest.fn(),
            decrementItem: jest.fn(),
        };

        mockVirtualPlayerService = {
            resetStats: jest.fn(),
            itemChoice: jest.fn(),
            handleTurnStart: jest.fn(),
            handleCombatTurnStart: jest.fn(),
            delay: jest.fn(),
        };

        mockGameSessionService = {
            updatePlayerPosition: jest.fn(),
            endTurn: jest.fn(),
            handleItemDropped: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerGateway,
                EventEmitter2,
                { provide: LobbyService, useValue: mockLobbyService },
                { provide: VirtualPlayerCreationService, useValue: mockVirtualPlayerCreationService },
                { provide: VirtualPlayerService, useValue: mockVirtualPlayerService },
                { provide: GameSessionService, useValue: mockGameSessionService },
                { provide: GameStatisticsService, useValue: mockGameStatisticsService },
            ],
        }).compile();

        gateway = module.get<VirtualPlayerGateway>(VirtualPlayerGateway);
        gateway.server = mockServer as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleCreateVirtualPlayer', () => {
        it('should create virtual player and emit updates', () => {
            const accessCode = '1234';
            const behavior = Behavior.Aggressive;
            const mockLobby = {
                players: [],
                isLocked: false,
            };
            const mockAvatars = ['avatar1', 'avatar2'];

            mockLobbyService.getLobby = jest.fn().mockReturnValue(mockLobby);
            mockVirtualPlayerCreationService.getUsedAvatars = jest.fn().mockReturnValue(mockAvatars);

            gateway.handleCreateVirtualPlayer({ behavior, accessCode });

            expect(mockVirtualPlayerCreationService.createVirtualPlayer).toHaveBeenCalledWith(behavior, mockLobby);
            expect(mockServer.to).toHaveBeenCalledWith(accessCode);
            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', mockLobby.players);
            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: mockAvatars });
            expect(mockServer.emit).not.toHaveBeenCalledWith('lobbyLocked', expect.anything());
        });

        it('should emit lobbyLocked if lobby is locked', () => {
            const accessCode = '1234';
            const behavior = Behavior.Aggressive;
            const mockLobby = {
                players: [],
                isLocked: true,
            };

            mockLobbyService.getLobby = jest.fn().mockReturnValue(mockLobby);
            mockVirtualPlayerCreationService.getUsedAvatars = jest.fn().mockReturnValue([]);

            gateway.handleCreateVirtualPlayer({ behavior, accessCode });

            expect(mockServer.emit).toHaveBeenCalledWith('lobbyLocked', { accessCode, isLocked: true });
        });
    });

    describe('handleKickVirtualPlayer', () => {
        it('should kick virtual player and emit updates', () => {
            const accessCode = '1234';
            const player = new Player();
            player.name = 'Bot';
            const mockLobby = {
                players: [player],
            };
            const mockAvatars = ['avatar1'];

            mockLobbyService.getLobby = jest.fn().mockReturnValue(mockLobby);
            mockVirtualPlayerCreationService.getUsedAvatars = jest.fn().mockReturnValue(mockAvatars);

            gateway.handleKickVirtualPlayer({ accessCode, player });

            expect(mockVirtualPlayerCreationService.kickVirtualPlayer).toHaveBeenCalledWith(mockLobby, player);
            expect(mockServer.emit).toHaveBeenCalledWith('updatePlayers', mockLobby.players);
            expect(mockServer.emit).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: mockAvatars });
        });
    });

    describe('handleVirtualPlayerMove', () => {
        it('should update player position successfully', async () => {
            const accessCode = '1234';
            const virtualPlayer = { name: 'vp1' } as Player;
            const data = {
                virtualPlayerTile: { player: virtualPlayer } as Tile,
                closestPlayerTile: {} as Tile,
                movement: [],
                accessCode,
            };

            await gateway.handleVirtualPlayerMove(data);

            expect(mockGameSessionService.updatePlayerPosition).toHaveBeenCalledWith(accessCode, data.movement, virtualPlayer);
        });
    });

    describe('handleEndVirtualPlayerTurn', () => {
        it('should reset stats and end turn', () => {
            const accessCode = '1234';

            gateway.handleEndVirtualPlayerTurn({ accessCode });

            expect(mockVirtualPlayerService.resetStats).toHaveBeenCalled();
        });
        it('should reset stats and call endTurn after delay', () => {
            jest.useFakeTimers();
            const accessCode = '1234';
            gateway.handleEndVirtualPlayerTurn({ accessCode });
            expect(mockVirtualPlayerService.resetStats).toHaveBeenCalled();
            jest.advanceTimersByTime(9999);
            jest.advanceTimersByTime(1);
            expect(mockGameSessionService.endTurn).toHaveBeenCalledWith(accessCode);
            jest.useRealTimers();
        });
    });

    describe('handleItemChoice', () => {
        it('should choose item and handle drop', () => {
            const accessCode = '1234';
            const player = { behavior: Behavior.Aggressive } as VirtualPlayer;
            const items = [{ id: 'item1' } as Item];
            const removedItem = { id: 'item1' } as Item;
            mockVirtualPlayerService.itemChoice = jest.fn().mockReturnValue(removedItem);
            const item = { name: 'item1' } as unknown as Item;
            gateway.handleItemChoice({ accessCode, player, items, itemPickUp: item });

            expect(mockVirtualPlayerService.itemChoice).toHaveBeenCalledWith(Behavior.Aggressive, items);
            expect(mockGameSessionService.handleItemDropped).toHaveBeenCalledWith(accessCode, player, removedItem);
        });

        it('should decrement item if removedItem matches itemPickUp', () => {
            const accessCode = '1234';
            const player = { behavior: Behavior.Aggressive } as VirtualPlayer;
            const items = [{ id: 'item1', name: 'fire' } as Item, { id: 'item2', name: 'shield' } as Item];
            const itemPickUp = { name: 'fire' } as Item;

            const removedItem = { name: 'fire' } as Item;
            mockVirtualPlayerService.itemChoice = jest.fn().mockReturnValue(removedItem);

            gateway.handleItemChoice({ accessCode, player, items, itemPickUp });

            expect(mockGameStatisticsService.decrementItem).toHaveBeenCalledWith(accessCode, itemPickUp, player);
            expect(mockGameSessionService.handleItemDropped).toHaveBeenCalledWith(accessCode, player, removedItem);
        });
    });

    describe('handleVirtualPlayerTurnStarted', () => {
        it('should handle turn start', () => {
            const accessCode = '1234';
            const player = {} as VirtualPlayer;

            gateway.handleVirtualPlayerTurnStarted({ accessCode, player });

            expect(mockVirtualPlayerService.handleTurnStart).toHaveBeenCalledWith(accessCode, player);
        });
    });

    describe('handleCombatTurnStarted', () => {
        it('should handle combat turn start', () => {
            const accessCode = '1234';
            const player = {} as VirtualPlayer;

            gateway.handleCombatTurnStarted({ accessCode, player });

            expect(mockVirtualPlayerService.handleCombatTurnStart).toHaveBeenCalledWith(accessCode, player);
        });
    });

    describe('handleActionDone', () => {
        it('should delay next action', () => {
            const accessCode = '1234';

            gateway.handleActionDone(accessCode);

            expect(mockVirtualPlayerService.delay).toHaveBeenCalledWith(accessCode);
        });
    });
});
