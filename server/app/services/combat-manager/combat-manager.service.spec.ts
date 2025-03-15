import { GameSessionService } from '@app/services/game-session/game-session.service';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { GameManagerService } from './combat-manager.service';

describe('GameManagerService', () => {
    let service: GameManagerService;

    const mockGameSessionService = {};
    const mockEventEmitter = {};
    const mockLogger = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameManagerService,
                { provide: GameSessionService, useValue: mockGameSessionService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: Logger, useValue: mockLogger },
            ],
        }).compile();

        service = module.get<GameManagerService>(GameManagerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
