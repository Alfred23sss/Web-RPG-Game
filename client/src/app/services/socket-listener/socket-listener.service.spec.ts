import { TestBed } from '@angular/core/testing';
import { SocketListenerService } from './socket-listener.service';
import { CombatSocketService } from '@app/services/combat-socket/combat-socket.service';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { TurnSocketService } from '@app/services/turn-socket/turn-socket.service';
import { EVENTS } from '@app/constants/global.constants';

describe('SocketListenerService', () => {
    let service: SocketListenerService;
    let mockGameStateService: jasmine.SpyObj<GameStateSocketService>;
    let mockCombatService: jasmine.SpyObj<CombatSocketService>;
    let mockTurnService: jasmine.SpyObj<TurnSocketService>;
    let mockGameSocketService: jasmine.SpyObj<GameSocketService>;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;

    beforeEach(() => {
        mockGameStateService = jasmine.createSpyObj('GameStateSocketService', ['initializeListeners']);
        mockCombatService = jasmine.createSpyObj('CombatSocketService', ['initializeCombatListeners']);
        mockTurnService = jasmine.createSpyObj('TurnSocketService', ['initializeTurnListeners']);
        mockGameSocketService = jasmine.createSpyObj('GameSocketService', ['initializeSocketListeners']);
        mockSocketClientService = jasmine.createSpyObj('SocketClientService', [], {
            socket: jasmine.createSpyObj('socket', ['off']),
        });

        TestBed.configureTestingModule({
            providers: [
                SocketListenerService,
                { provide: GameStateSocketService, useValue: mockGameStateService },
                { provide: CombatSocketService, useValue: mockCombatService },
                { provide: TurnSocketService, useValue: mockTurnService },
                { provide: GameSocketService, useValue: mockGameSocketService },
                {
                    provide: SocketClientService,
                    useValue: mockSocketClientService,
                },
            ],
        });

        service = TestBed.inject(SocketListenerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('initializeAllSocketListeners', () => {
        it('should initialize all service listeners', () => {
            service.initializeAllSocketListeners();

            expect(mockGameStateService.initializeListeners).toHaveBeenCalled();
            expect(mockCombatService.initializeCombatListeners).toHaveBeenCalled();
            expect(mockTurnService.initializeTurnListeners).toHaveBeenCalled();
            expect(mockGameSocketService.initializeSocketListeners).toHaveBeenCalled();
        });
    });

    describe('unsubscribeSocketListeners', () => {
        it('should unsubscribe from all socket events', () => {
            service.unsubscribeSocketListeners();

            EVENTS.forEach((event) => {
                expect(mockSocketClientService.socket.off).toHaveBeenCalledWith(event);
            });

            expect(mockSocketClientService.socket.off).toHaveBeenCalledTimes(EVENTS.length);
        });
    });
});