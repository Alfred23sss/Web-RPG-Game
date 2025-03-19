/* eslint-disable import/no-deprecated */
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Game } from '@app/interfaces/game';
import { environment } from 'src/environments/environment';
import { GameCommunicationService } from './game-communication.service';

describe('GameCommunicationService', () => {
    let service: GameCommunicationService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.serverUrl + '/games';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [GameCommunicationService],
        });

        service = TestBed.inject(GameCommunicationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should retrieve all games', () => {
        const testGames: Game[] = [
            {
                id: '1',
                name: 'Game One',
                size: 'small',
                mode: 'Classic',
                lastModified: new Date(),
                isVisible: true,
                previewImage: 'path/to/image1.jpg',
                description: 'First game description',
                grid: undefined,
            },
            {
                id: '2',
                name: 'Game Two',
                size: 'medium',
                mode: 'CTF',
                lastModified: new Date(),
                isVisible: false,
                previewImage: 'path/to/image2.jpg',
                description: 'Second game description',
                grid: undefined,
            },
        ];

        service.getAllGames().subscribe((games) => {
            expect(games.length).toBe(2);
            expect(games).toEqual(testGames);
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('GET');
        req.flush(testGames);
    });

    it('should retrieve a single game by ID', () => {
        const testGame: Game = {
            id: '1',
            name: 'Game One',
            size: 'small',
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'path/to/image1.jpg',
            description: 'First game description',
            grid: undefined,
        };

        service.getGameById('1').subscribe((game) => {
            expect(game).toEqual(testGame);
        });

        const req = httpMock.expectOne(`${apiUrl}/1`);
        expect(req.request.method).toBe('GET');
        req.flush(testGame);
    });

    it('should save a new game', () => {
        const newGame: Game = {
            id: '3',
            name: 'Game Three',
            size: 'large',
            mode: 'CTF',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'path/to/image3.jpg',
            description: 'Third game description',
            grid: undefined,
        };

        service.saveGame(newGame).subscribe((game) => {
            expect(game).toEqual(newGame);
        });

        const req = httpMock.expectOne(`${apiUrl}/create`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(newGame);
        req.flush(newGame);
    });

    it('should update an existing game', () => {
        const updatedGame: Partial<Game> = { name: 'Updated Game', size: '15x15' };

        const expectedGame: Game = {
            id: '1',
            name: updatedGame.name ?? 'Default Name',
            size: updatedGame.size ?? '10x10',
            mode: updatedGame.mode ?? 'Classic',
            lastModified: updatedGame.lastModified ?? new Date(),
            isVisible: updatedGame.isVisible ?? true,
            previewImage: updatedGame.previewImage ?? '',
            description: updatedGame.description ?? '',
            grid: updatedGame.grid ?? undefined,
        };

        service.updateGame('1', updatedGame).subscribe((game) => {
            expect(game).toEqual(expectedGame);
        });

        const req = httpMock.expectOne(`${apiUrl}/update/1`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual(updatedGame);
        req.flush(expectedGame);
    });

    it('should delete a game by ID', () => {
        const deletedGame: Game = {
            id: '1',
            name: 'Game One',
            size: 'small',
            mode: 'Classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'path/to/image1.jpg',
            description: 'First game description',
            grid: undefined,
        };

        service.deleteGame('1').subscribe((game) => {
            expect(game).toEqual(deletedGame);
        });

        const req = httpMock.expectOne(`${apiUrl}/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush(deletedGame);
    });
});
