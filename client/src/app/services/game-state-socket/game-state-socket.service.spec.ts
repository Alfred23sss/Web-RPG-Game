import { TestBed } from '@angular/core/testing';
import { GameStateSocketService } from './game-state-socket.service';
import { GameData } from '@app/classes/gameData';
import { skip, filter } from 'rxjs/operators';
import { MOCK_GAME, MOCK_LOBBY, MOCK_PLAYER } from '@app/constants/global.constants';

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

    it('should handle missing sessionStorage items by keeping existing values', () => {
        GAME_DATA.lobby = MOCK_LOBBY;
        GAME_DATA.clientPlayer = MOCK_PLAYER;
        GAME_DATA.game = MOCK_GAME;
        service.updateGameData(GAME_DATA);

        sessionStorageSpy.and.returnValue(null);

        service.fetchGameData();

        expect(service.gameDataSubjectValue.lobby).toEqual(MOCK_LOBBY);
        expect(service.gameDataSubjectValue.clientPlayer).toEqual(MOCK_PLAYER);
        expect(service.gameDataSubjectValue.game).toEqual(MOCK_GAME);
    });

    it('should initialize listeners', () => {
        const fetchSpy = spyOn(service, 'fetchGameData');
        service.initializeListeners();
        expect(fetchSpy).toHaveBeenCalled();
    });

    it('should provide observable access to game data', (done) => {
        const testData = new GameData();
        testData.clientPlayer = MOCK_PLAYER;

        service.gameData$
            .pipe(
                skip(1),
                filter((data) => !!data.clientPlayer),
            )
            .subscribe((data) => {
                expect(data.clientPlayer).toEqual(
                    jasmine.objectContaining({
                        name: MOCK_PLAYER.name,
                        avatar: MOCK_PLAYER.avatar,
                    }),
                );
                done();
            });

        service.updateGameData(testData);
    });
});
