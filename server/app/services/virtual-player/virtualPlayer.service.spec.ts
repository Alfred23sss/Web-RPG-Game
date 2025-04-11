import { LobbyService } from '@app/services/lobby/lobby.service';
import { PlayerMovementService } from '@app/services/player-movement/playerMovement.service';
import { AggressiveVPService } from '@app/services/vp-aggressive/aggressiveVP.service';
import { DefensiveVPService } from '@app/services/vp-defensive/defensiveVP.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerService } from './virtualPlayer.service';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;

    const mockEventEmitter = { on: jest.fn() };
    const mockAggressiveVPService = {};
    const mockDefensiveVPService = {};
    const mockLobbyService = { getLobby: jest.fn() };
    const mockPlayerMovementService = {
        availablePath: jest.fn(),
        quickestPath: jest.fn(),
        getMoveCost: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerService,
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: AggressiveVPService, useValue: mockAggressiveVPService },
                { provide: DefensiveVPService, useValue: mockDefensiveVPService },
                { provide: LobbyService, useValue: mockLobbyService },
                { provide: PlayerMovementService, useValue: mockPlayerMovementService },
            ],
        }).compile();

        service = module.get<VirtualPlayerService>(VirtualPlayerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
