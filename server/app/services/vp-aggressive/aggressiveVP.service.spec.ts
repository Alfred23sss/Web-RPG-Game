/* eslint-disable object-shorthand */
import { AggressiveVPService } from './aggressiveVP.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { PlayerMovementService } from '@app/services/player-movement/playerMovement.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { EventEmitter2 } from 'eventemitter2';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';

describe('AggressiveVPService', () => {
    let service: AggressiveVPService;

    const mockLobbyService = {};
    const mockPlayerMovementService = {
        findClosestReachableTile: jest.fn(),
        quickestPath: jest.fn(),
    };
    const mockGridManagerService = {
        findTileByPlayer: jest.fn(),
    };
    const mockGameCombatService = {
        startCombat: jest.fn(),
    };
    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(() => {
        return (service = new AggressiveVPService(
            mockLobbyService as LobbyService,
            mockPlayerMovementService as unknown as PlayerMovementService,
            mockGridManagerService as unknown as GridManagerService,
            mockEventEmitter as unknown as EventEmitter2,
            mockGameCombatService as unknown as GameCombatService,
        ));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
