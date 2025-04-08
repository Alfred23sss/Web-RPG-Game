import { Test, TestingModule } from '@nestjs/testing';
import { DefensiveVPService } from './defensiveVP.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
describe('DefensiveVPService', () => {
    let service: DefensiveVPService;
    let lobbyService: LobbyService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DefensiveVPService,
                {
                    provide: LobbyService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<DefensiveVPService>(DefensiveVPService);
        lobbyService = module.get<LobbyService>(LobbyService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have lobbyService injected', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((service as any).lobbyService).toBe(lobbyService);
    });
});
