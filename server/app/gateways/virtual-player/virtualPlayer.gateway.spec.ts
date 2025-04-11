import { Behavior } from '@app/enums/enums';
import { Item } from '@app/interfaces/Item';
import { Tile } from '@app/interfaces/Tile';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { Player } from '@app/model/database/player';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerCreationService } from '@app/services/virtual-player-creation/virtualPlayerCreation.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtualPlayer.service';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { VirtualPlayerGateway } from './virtualPlayer.gateway';

describe('VirtualPlayerGateway', () => {
    let gateway: VirtualPlayerGateway;
    let mockServer: Partial<Server>;
    let mockLobbyService: Partial<LobbyService>;
    let mockVirtualPlayerCreationService: Partial<VirtualPlayerCreationService>;
    let mockVirtualPlayerService: Partial<VirtualPlayerService>;
    let mockGameSessionService: Partial<GameSessionService>;
    let mockLogger: Partial<Logger>;
    let eventEmitter: EventEmitter2;

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

        mockLogger = {
            error: jest.fn(),
            log: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerGateway,
                EventEmitter2,
                { provide: LobbyService, useValue: mockLobbyService },
                { provide: VirtualPlayerCreationService, useValue: mockVirtualPlayerCreationService },
                { provide: VirtualPlayerService, useValue: mockVirtualPlayerService },
                { provide: GameSessionService, useValue: mockGameSessionService },
                { provide: Logger, useValue: mockLogger },
            ],
        }).compile();

        gateway = module.get<VirtualPlayerGateway>(VirtualPlayerGateway);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
        gateway.server = mockServer as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleCreateVirtualPlayer', () => {
        it('should create virtual player and emit updates', () => {
            const accessCode = 'TEST123';
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
            const accessCode = 'TEST123';
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
            const accessCode = 'TEST123';
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
            const accessCode = 'TEST123';
            const virtualPlayer = { name: 'vp1' } as Player;
            const data = {
                virtualPlayerTile: { player: virtualPlayer } as Tile,
                closestPlayerTile: {} as Tile,
                movement: [],
                accessCode,
            };

            await gateway.handleVirtualPlayerMove(data);

            expect(mockGameSessionService.updatePlayerPosition).toHaveBeenCalledWith(accessCode, data.movement, virtualPlayer);
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        it('should log error if update fails', async () => {
            const accessCode = 'TEST123';
            const virtualPlayer = { name: 'vp1' } as Player;
            const data = {
                virtualPlayerTile: { player: virtualPlayer } as Tile,
                closestPlayerTile: {} as Tile,
                movement: [],
                accessCode,
            };
            const error = new Error('Update failed');
            mockGameSessionService.updatePlayerPosition = jest.fn().mockRejectedValue(error);

            await gateway.handleVirtualPlayerMove(data);

            expect(mockLogger.error).toHaveBeenCalledWith('Error updating virtual player position', error);
        });
    });

    describe('handleEndVirtualPlayerTurn', () => {
        it('should reset stats and end turn', () => {
            const accessCode = 'TEST123';

            gateway.handleEndVirtualPlayerTurn({ accessCode });

            expect(mockVirtualPlayerService.resetStats).toHaveBeenCalled();
            expect(mockGameSessionService.endTurn).toHaveBeenCalledWith(accessCode);
        });
    });

    describe('handleItemChoice', () => {
        it('should choose item and handle drop', () => {
            const accessCode = 'TEST123';
            const player = { behavior: Behavior.Aggressive } as VirtualPlayer;
            const items = [{ id: 'item1' } as Item];
            const removedItem = { id: 'item1' } as Item;

            mockVirtualPlayerService.itemChoice = jest.fn().mockReturnValue(removedItem);

            gateway.handleItemChoice({ accessCode, player, items });

            expect(mockVirtualPlayerService.itemChoice).toHaveBeenCalledWith(Behavior.Aggressive, items);
            expect(mockGameSessionService.handleItemDropped).toHaveBeenCalledWith(accessCode, player, removedItem);
        });
    });

    describe('handleVirtualPlayerTurnStarted', () => {
        it('should handle turn start', () => {
            const accessCode = 'TEST123';
            const player = {} as VirtualPlayer;

            gateway.handleVirtualPlayerTurnStarted({ accessCode, player });

            expect(mockVirtualPlayerService.handleTurnStart).toHaveBeenCalledWith(accessCode, player);
        });
    });

    describe('handleCombatTurnStarted', () => {
        it('should handle combat turn start', () => {
            const accessCode = 'TEST123';
            const player = {} as VirtualPlayer;

            gateway.handleCombatTurnStarted({ accessCode, player });

            expect(mockVirtualPlayerService.handleCombatTurnStart).toHaveBeenCalledWith(accessCode, player);
        });
    });

    describe('handleActionDone', () => {
        it('should delay next action', () => {
            const accessCode = 'TEST123';

            gateway.handleActionDone(accessCode);

            expect(mockVirtualPlayerService.delay).toHaveBeenCalledWith(accessCode);
        });
    });
});
