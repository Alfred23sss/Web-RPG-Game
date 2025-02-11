import { TestBed } from '@angular/core/testing';

import { GameMode, GameSize } from '@app/interfaces/game';
import { GameModeService } from './game-mode.service';

describe('GameModeService', () => {
    let service: GameModeService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameModeService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initially have gameMode and gameSize set to None', () => {
        expect(service.getGameMode()).toBe(GameMode.None);
        expect(service.getGameSize()).toBe(GameSize.None);
    });

    it('should set and get gameMode correctly', () => {
        const newGameMode = 'Classic';
        service.setGameMode(newGameMode);

        expect(service.getGameMode()).toBe(newGameMode);
    });

    it('should set and get gameSize correctly', () => {
        const newGameSize = 'medium';
        service.setGameSize(newGameSize);

        expect(service.getGameSize()).toBe(newGameSize);
    });
});
