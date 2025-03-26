import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EVENTS } from '@app/constants/global.constants';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { CombatSocketService } from '@app/services/combat-socket/combat-socket.service';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { TurnSocketService } from '@app/services/turn-socket/turn-socket.service';
import { SocketListenerService } from './socket-listener.service';

// Create a test-specific subclass to expose the method for testing
class TestSocketListenerService extends SocketListenerService {
    testUnsubscribeSocketListeners(events: string[]): void {
        events.forEach((event) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any).socketClientService.off(event);
        });
    }
}
describe('SocketListenerService', () => {
    let service: TestSocketListenerService;
    let gameStateServiceSpy: jasmine.SpyObj<GameStateSocketService>;
    let combatSocketServiceSpy: jasmine.SpyObj<CombatSocketService>;
    let turnSocketServiceSpy: jasmine.SpyObj<TurnSocketService>;
    let gameSocketServiceSpy: jasmine.SpyObj<GameSocketService>;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;

    beforeEach(() => {
        const createSpyObj = (methods: string[]) => jasmine.createSpyObj('Service', methods);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                {
                    provide: SocketListenerService,
                    useClass: TestSocketListenerService,
                },
                {
                    provide: GameStateSocketService,
                    useValue: createSpyObj(['initializeListeners']),
                },
                {
                    provide: CombatSocketService,
                    useValue: createSpyObj(['initializeCombatListeners']),
                },
                {
                    provide: TurnSocketService,
                    useValue: createSpyObj(['initializeTurnListeners']),
                },
                {
                    provide: GameSocketService,
                    useValue: createSpyObj(['initializeSocketListeners']),
                },
                {
                    provide: SocketClientService,
                    useValue: createSpyObj(['off']),
                },
                {
                    provide: AccessCodesCommunicationService,
                    useValue: createSpyObj(['validateAccessCode', 'removeAccessCode']),
                },
            ],
        });

        service = TestBed.inject(SocketListenerService) as TestSocketListenerService;
        gameStateServiceSpy = TestBed.inject(GameStateSocketService) as jasmine.SpyObj<GameStateSocketService>;
        combatSocketServiceSpy = TestBed.inject(CombatSocketService) as jasmine.SpyObj<CombatSocketService>;
        turnSocketServiceSpy = TestBed.inject(TurnSocketService) as jasmine.SpyObj<TurnSocketService>;
        gameSocketServiceSpy = TestBed.inject(GameSocketService) as jasmine.SpyObj<GameSocketService>;
        socketClientServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('initializeAllSocketListeners', () => {
        it('should initialize listeners for all socket services', () => {
            service.initializeAllSocketListeners();

            expect(gameStateServiceSpy.initializeListeners).toHaveBeenCalled();
            expect(combatSocketServiceSpy.initializeCombatListeners).toHaveBeenCalled();
            expect(turnSocketServiceSpy.initializeTurnListeners).toHaveBeenCalled();
            expect(gameSocketServiceSpy.initializeSocketListeners).toHaveBeenCalled();
        });
    });

    describe('unsubscribeSocketListeners', () => {
        it('should call off method for each event in EVENTS', () => {
            service.unsubscribeSocketListeners();

            EVENTS.forEach((event) => {
                expect(socketClientServiceSpy.off).toHaveBeenCalledWith(event);
            });

            expect(socketClientServiceSpy.off).toHaveBeenCalledTimes(EVENTS.length);
        });

        it('should handle empty EVENTS scenario', () => {
            service.testUnsubscribeSocketListeners([]);

            expect(socketClientServiceSpy.off).not.toHaveBeenCalled();
        });
    });
});
