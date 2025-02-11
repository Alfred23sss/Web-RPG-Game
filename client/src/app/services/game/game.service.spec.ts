/*import { TestBed } from '@angular/core/testing';
import { Game } from '@app/interfaces/game';
import { ImageType } from '@app/interfaces/images';
import { Tile, TileType } from '@app/interfaces/tile';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { ScreenshotService } from '@app/services/generate-screenshots/generate-screenshots.service';
import { GridService } from '@app/services/grid/grid-service.service';
import { of } from 'rxjs';
import { GameService } from './game.service';

const DEFAULT_SIZE_GRID = 3;

describe('GameService', () => {
    let service: GameService;
    let gameCommunicationServiceSpy: jasmine.SpyObj<GameCommunicationService>;
    let gridServiceSpy: jasmine.SpyObj<GridService>;
    let screenShotServiceSpy: jasmine.SpyObj<ScreenshotService>;

    let testGame1: Game;
    let testGame2: Game;

    beforeEach(() => {
        gameCommunicationServiceSpy = jasmine.createSpyObj('GameCommunicationService', ['getAllGames', 'saveGame', 'updateGame', 'deleteGame']);
        screenShotServiceSpy = jasmine.createSpyObj('ScreenShotService', ['generatePreview']);

        const testTile: Tile = {
            id: 'tile-1-1',
            imageSrc: ImageType.Default,
            isOccupied: false,
            type: TileType.Default,
            isOpen: true,
        };

        gridServiceSpy = jasmine.createSpyObj('GridService', ['createGrid']);
        gridServiceSpy.createGrid.and.returnValue([
            [testTile, testTile, testTile],
            [testTile, testTile, testTile],
            [testTile, testTile, testTile],
        ]);

        TestBed.configureTestingModule({
            providers: [
                GameService,
                { provide: GameCommunicationService, useValue: gameCommunicationServiceSpy },
                { provide: GridService, useValue: gridServiceSpy },
                { provide: ScreenshotService, useValue: screenShotServiceSpy },
            ],
        });

        service = TestBed.inject(GameService);

        testGame1 = {
            id: 'game-1',
            name: 'Classic Game 1',
            size: String(DEFAULT_SIZE_GRID),
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: '',
            description: 'Description 1',
            grid: gridServiceSpy.createGrid(DEFAULT_SIZE_GRID, DEFAULT_SIZE_GRID),
        };

        testGame2 = {
            id: 'game-2',
            name: 'Classic Game 2',
            size: String(DEFAULT_SIZE_GRID),
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: '',
            description: 'Description 2',
            grid: gridServiceSpy.createGrid(DEFAULT_SIZE_GRID, DEFAULT_SIZE_GRID),
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should update current game', () => {
        spyOn(sessionStorage, 'setItem');

        service.updateCurrentGame(testGame1);

        expect(service['currentGame']).toEqual(testGame1);
        expect(sessionStorage.setItem).toHaveBeenCalledWith('currentGame', JSON.stringify(testGame1));
    });

    it('should create new game', () => {
        const expectedGame = {
            id: 'game-1',
            name: '',
            size: String(DEFAULT_SIZE_GRID),
            mode: 'Classic',
            lastModified: jasmine.any(Date),
            isVisible: false,
            previewImage: '',
            description: '',
            grid: gridServiceSpy.createGrid(DEFAULT_SIZE_GRID, DEFAULT_SIZE_GRID),
        };

        const newGame = service.createNewGame('Classic', DEFAULT_SIZE_GRID);
        expect(newGame.name).toEqual(expectedGame.name);
        expect(newGame.size).toEqual(expectedGame.size);
        expect(newGame.mode).toEqual(expectedGame.mode);
        expect(newGame.isVisible).toEqual(expectedGame.isVisible);
        expect(newGame.previewImage).toEqual(expectedGame.previewImage);
        expect(newGame.description).toEqual(expectedGame.description);
        expect(newGame.grid).toEqual(expectedGame.grid);

        expect(newGame.id).toEqual(jasmine.any(String));
        expect(newGame.lastModified).toEqual(jasmine.any(Date));
    });

    it('should call delete game from gamecommunication service and with correct id', () => {
        gameCommunicationServiceSpy.deleteGame.and.returnValue(of(testGame1));

        spyOn(service, 'removeGame');

        service.deleteGame(testGame1.id).subscribe();

        expect(gameCommunicationServiceSpy.deleteGame).toHaveBeenCalledWith(testGame1.id);
    });

    it('should add game', () => {
        service.addGame(testGame1);

        expect(service['games']).toContain(testGame1);
    });

    it('should get all games', () => {
        service.addGame(testGame1);
        service.addGame(testGame2);

        const games = service.getGames();
        expect(games).toEqual([testGame1, testGame2]);
    });

    it('should get a game by ID', () => {
        service.addGame(testGame1);
        service.addGame(testGame2);

        const fetchedGame = service.getGameById(testGame1.id);
        expect(fetchedGame).toEqual(testGame1);

        const nonExistentGame = service.getGameById('game-3');
        expect(nonExistentGame).toBeUndefined();
    });

    it('should remove the game by id', () => {
        service.addGame(testGame1);
        service.addGame(testGame2);

        expect(service.getGames().length).toBe(2);

        service.removeGame(testGame1.id);

        expect(service.getGames().length).toBe(1);
        expect(service.getGameById(testGame1.id)).toBeUndefined();
        expect(service.getGameById(testGame2.id)).toEqual(testGame2);
    });

    it('should call getAllGames from gamecommunication service', () => {
        gameCommunicationServiceSpy.getAllGames.and.returnValue(of([testGame1]));

        service.fetchGames().subscribe(() => {
            expect(gameCommunicationServiceSpy.getAllGames).toHaveBeenCalled();

            expect(service.getGames()).toEqual([testGame1]);
        });
    });

    it('should update game visibility and save the game', () => {
        spyOn(service, 'getGameById').and.returnValue(testGame1);

        spyOn(service, 'saveGame');

        const newVisibility = false;
        service.updateGameVisibility(testGame1.id, newVisibility);

        expect(service.getGameById).toHaveBeenCalledWith(testGame1.id);

        expect(testGame1.isVisible).toBe(newVisibility);

        expect(service.saveGame).toHaveBeenCalledWith(testGame1);
    });

    it('should update existing game if it exists', () => {
        spyOn(service, 'getGameById').and.returnValue(testGame1);

        gameCommunicationServiceSpy.updateGame.and.returnValue(of(testGame1));

        service.saveGame(testGame1);

        expect(service.getGameById).toHaveBeenCalledWith(testGame1.id);
        expect(gameCommunicationServiceSpy.updateGame).toHaveBeenCalledWith(testGame1.id, testGame1);
    });

    it('should save new game if it does not exist', () => {
        spyOn(service, 'getGameById').and.returnValue(undefined);

        spyOn(service, 'saveGame').and.callThrough();

        const spy = spyOn(service as unknown as { saveNewGame: (gameToAdd: Game) => void }, 'saveNewGame');

        service.saveGame(testGame2);

        expect(service.getGameById).toHaveBeenCalledWith(testGame2.id);

        expect(spy).toHaveBeenCalledWith(testGame2);
    });

    it('should return the current game if it exists', () => {
        service['currentGame'] = testGame1;

        expect(service.getCurrentGame()).toBe(testGame1);
    });

    it('should load the current game from sessionStorage if not set', () => {
        spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify(testGame1));

        expect(service.getCurrentGame()).toEqual(testGame1);
    });

    it('should load the current game from sessionStorage if not already set', () => {
        spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify(testGame1));
        service['currentGame'] = undefined;

        expect(service.getCurrentGame()).toEqual(testGame1);
    });

    it('should clear the current game and remove it from sessionStorage', () => {
        spyOn(sessionStorage, 'removeItem');
        service['currentGame'] = testGame1;

        service.clearCurrentGame();

        expect(service['currentGame']).toBeUndefined();
        expect(sessionStorage.removeItem).toHaveBeenCalledWith('currentGame');
    });

    it('should return true if the game name is already used by another game', () => {
        service['games'] = [testGame1, testGame2];

        expect(service.isGameNameUsed(testGame1.name)).toBe(true);
    });

    it('should update an existing game in the games array when found', () => {
        const updatedGame = { ...testGame1, name: 'Updated Name' };
        service.games = [testGame1];

        gameCommunicationServiceSpy.updateGame.and.returnValue(of(updatedGame)); // Change juste le return

        service['updateExistingGame'](testGame1);

        expect(gameCommunicationServiceSpy.updateGame).toHaveBeenCalledWith(testGame1.id, testGame1);
        expect(service.games[0]).toEqual(updatedGame);
    });

    it('should save a new game and add it to the games array', () => {
        gameCommunicationServiceSpy.saveGame.calls.reset();

        const saveGameSpy = gameCommunicationServiceSpy.saveGame.and.returnValue(of(testGame1));
        const addGameSpy = spyOn(service, 'addGame');

        service['saveNewGame'](testGame1);

        expect(saveGameSpy).toHaveBeenCalledWith(testGame1);
        expect(addGameSpy).toHaveBeenCalledWith(testGame1);
    });

    it('should call generatePreview and return the preview image', async () => {
        const mockPreviewImage = 'mock-preview.png';
        screenShotServiceSpy.generatePreview.and.returnValue(Promise.resolve(mockPreviewImage));

        const result = await service.savePreviewImage();

        expect(screenShotServiceSpy.generatePreview).toHaveBeenCalledWith('game-preview');
        expect(result).toBe(mockPreviewImage);
    });
});*/
