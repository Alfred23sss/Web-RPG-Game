import { TestBed } from '@angular/core/testing';
import { GameData } from '@app/classes/game-data/game-data';
import { MOCK_GAME, MOCK_LOBBY, MOCK_PLAYER } from '@app/constants/global.constants';
import { GameStateSocketService } from './game-state-socket.service';

const GAME_DATA = new GameData();

describe('GameStateSocketService', () => {
    let service: GameStateSocketService;
    let sessionStorageSpy: jasmine.Spy;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameStateSocketService);

        service['gameData'] = new GameData();
        sessionStorageSpy = spyOn(sessionStorage, 'getItem');
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should update game data and notify subscribers', () => {
        let receivedData: GameData | undefined;

        service.gameData$.subscribe((data) => (receivedData = data));
        service.updateGameData(GAME_DATA);

        expect(service.gameDataSubjectValue).toEqual(GAME_DATA);
        expect(receivedData).toEqual(GAME_DATA);
    });

    it('should properly handle closePopup emissions', () => {
        const spy = jasmine.createSpy();
        const subscription = service.closePopup$.subscribe(spy);

        service.updateClosePopup();

        expect(spy).toHaveBeenCalled();
        subscription.unsubscribe();
    });

    it('should load complete data from sessionStorage', () => {
        sessionStorageSpy.withArgs('lobby').and.returnValue(JSON.stringify({ ...MOCK_LOBBY, game: null }));
        sessionStorageSpy.withArgs('player').and.returnValue(JSON.stringify(MOCK_PLAYER));
        sessionStorageSpy.withArgs('orderedPlayers').and.returnValue(JSON.stringify([MOCK_PLAYER]));
        sessionStorageSpy.withArgs('game').and.returnValue(JSON.stringify(MOCK_GAME));

        service.fetchGameData();

        expect(service.gameDataSubjectValue.lobby).toEqual(
            jasmine.objectContaining({
                players: [MOCK_PLAYER],
            }),
        );
        expect(service.gameDataSubjectValue.clientPlayer).toEqual(MOCK_PLAYER);
        expect(service.gameDataSubjectValue.game).toEqual(
            jasmine.objectContaining({
                id: MOCK_GAME.id,
                name: MOCK_GAME.name,
            }),
        );
    });

    it('should initialize listeners', () => {
        const fetchSpy = spyOn(service, 'fetchGameData');
        service.initializeListeners();
        expect(fetchSpy).toHaveBeenCalled();
    });

    it('should handle missing lobby data', () => {
        sessionStorageSpy.withArgs('lobby').and.returnValue(null);
        sessionStorageSpy.withArgs('player').and.returnValue(JSON.stringify(MOCK_PLAYER));
        sessionStorageSpy.withArgs('orderedPlayers').and.returnValue('[]');
        sessionStorageSpy.withArgs('game').and.returnValue(JSON.stringify(MOCK_GAME));

        service.fetchGameData();

        expect(service.gameDataSubjectValue.clientPlayer).toEqual(MOCK_PLAYER);
        expect(service.gameDataSubjectValue.game?.id).toEqual(MOCK_GAME.id);
    });

    it('should handle missing player data', () => {
        sessionStorageSpy.withArgs('lobby').and.returnValue(JSON.stringify(MOCK_LOBBY));
        sessionStorageSpy.withArgs('player').and.returnValue(null);
        sessionStorageSpy.withArgs('orderedPlayers').and.returnValue('[]');
        sessionStorageSpy.withArgs('game').and.returnValue(JSON.stringify(MOCK_GAME));

        service.fetchGameData();

        expect(service.gameDataSubjectValue.game?.id).toEqual(MOCK_GAME.id);
    });

    it('should handle missing game data', () => {
        sessionStorageSpy.withArgs('lobby').and.returnValue(JSON.stringify(MOCK_LOBBY));
        sessionStorageSpy.withArgs('player').and.returnValue(JSON.stringify(MOCK_PLAYER));
        sessionStorageSpy.withArgs('orderedPlayers').and.returnValue('[]');
        sessionStorageSpy.withArgs('game').and.returnValue(null);

        service.fetchGameData();

        expect(service.gameDataSubjectValue.clientPlayer).toEqual(MOCK_PLAYER);
    });

    it('should use empty array when orderedPlayers is missing', () => {
        sessionStorageSpy.withArgs('orderedPlayers').and.returnValue(null);
        sessionStorageSpy.withArgs('lobby').and.returnValue(JSON.stringify(MOCK_LOBBY));
        sessionStorageSpy.withArgs('player').and.returnValue(JSON.stringify(MOCK_PLAYER));
        sessionStorageSpy.withArgs('game').and.returnValue(JSON.stringify(MOCK_GAME));
        service.fetchGameData();
        expect(service.gameDataSubjectValue.lobby.players).toEqual([]);
    });
});
