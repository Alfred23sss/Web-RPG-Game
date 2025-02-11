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
        const newGameMode = GameMode.Classic;
        service.setGameMode(newGameMode);

        expect(service.getGameMode()).toBe(newGameMode);
    });

    it('should set and get gameSize correctly', () => {
        const newGameSize = GameSize.Medium;
        service.setGameSize(newGameSize);

        expect(service.getGameSize()).toBe(newGameSize);
    });

    it('should return false if size is not valid', () => {
        const invalidGameSize = 'invalid' as GameSize;

        expect(service.setGameSize(invalidGameSize)).toBeFalse();
    });

    it('should reset game mode and size', () => {
        service.resetModeAndSize();

        expect(service.getGameSize()).toBe(GameSize.None);
        expect(service.getGameMode()).toBe(GameMode.None);
    });
});
