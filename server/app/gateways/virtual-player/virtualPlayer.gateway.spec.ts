/* eslint-disable @typescript-eslint/no-explicit-any */
import { Behavior } from '@app/enums/enums';
import { Player } from '@app/interfaces/Player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerService } from '@app/services/virtual-player-creation/virtualPlayerCreation.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerGateway } from './virtualPlayer.gateway';

describe('VirtualPlayerGateway', () => {
    let gateway: VirtualPlayerGateway;
    let mockServer: { to: jest.Mock };
    let lobbyService: LobbyService;
    let virtualPlayerService: VirtualPlayerService;

    const mockLobby = {
        players: [{ name: 'Bot1' } as Player],
        isLocked: true,
    };

    beforeEach(async () => {
        mockServer = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerGateway,
                {
                    provide: LobbyService,
                    useValue: {
                        getLobby: jest.fn().mockReturnValue(mockLobby),
                    },
                },
                {
                    provide: VirtualPlayerService,
                    useValue: {
                        createVirtualPlayer: jest.fn(),
                        getUsedAvatars: jest.fn().mockReturnValue(['avatar1', 'avatar2']),
                        kickVirtualPlayer: jest.fn(),
                    },
                },
                {
                    provide: Logger,
                    useValue: {
                        log: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<VirtualPlayerGateway>(VirtualPlayerGateway);
        lobbyService = module.get<LobbyService>(LobbyService);
        virtualPlayerService = module.get<VirtualPlayerService>(VirtualPlayerService);
        (gateway as any).server = mockServer;
    });

    describe('handleCreateVirtualPlayer', () => {
        it('should create a virtual player and emit events', () => {
            const data = {
                behavior: Behavior.Aggressive,
                accessCode: '1234',
            };

            gateway.handleCreateVirtualPlayer(data);

            expect(lobbyService.getLobby).toHaveBeenCalledWith(data.accessCode);
            expect(virtualPlayerService.createVirtualPlayer).toHaveBeenCalledWith(data.behavior, mockLobby);
            expect(virtualPlayerService.getUsedAvatars).toHaveBeenCalledWith(mockLobby);

            expect(mockServer.to).toHaveBeenCalledWith(data.accessCode);

            const emitCalls = mockServer.to(data.accessCode).emit as jest.Mock;
            expect(emitCalls).toHaveBeenCalledWith('updatePlayers', mockLobby.players);
            expect(emitCalls).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: ['avatar1', 'avatar2'] });
            expect(emitCalls).toHaveBeenCalledWith('lobbyLocked', { accessCode: data.accessCode, isLocked: true });
        });
    });

    describe('handleKickVirtualPlayer', () => {
        it('should kick a player and emit updates', () => {
            const data = {
                accessCode: '0493',
                player: { name: 'Bot1' } as Player,
            };

            gateway.handleKickVirtualPlayer(data);

            expect(lobbyService.getLobby).toHaveBeenCalledWith(data.accessCode);
            expect(virtualPlayerService.kickVirtualPlayer).toHaveBeenCalledWith(mockLobby, data.player);
            expect(virtualPlayerService.getUsedAvatars).toHaveBeenCalledWith(mockLobby);

            const emitCalls = mockServer.to(data.accessCode).emit as jest.Mock;
            expect(emitCalls).toHaveBeenCalledWith('updatePlayers', mockLobby.players);
            expect(emitCalls).toHaveBeenCalledWith('updateUnavailableOptions', { avatars: ['avatar1', 'avatar2'] });
        });
    });
});
