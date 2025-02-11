import { GameController } from '@app/controllers/game/game.controller';
import { GameDocument } from '@app/model/database/game';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { GameService } from '@app/services/game/game.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { createStubInstance, SinonStubbedInstance } from 'sinon';

const STATUS_OK = 200;
const TEST_GAME_ID = '1';
const TEST_GAME = {
    id: TEST_GAME_ID,
    name: 'Test Game',
    size: 'Large',
    mode: 'Multiplayer',
    lastModified: new Date(),
    isVisible: true,
    previewImage: 'test.png',
    description: 'A test game',
    grid: [[]],
};
const GAME_UPDATE: Partial<UpdateGameDto> = { mode: 'Singleplayer' };

const createMockResponse = () => {
    const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
};

describe('GameController', () => {
    let controller: GameController;
    let gameService: SinonStubbedInstance<GameService>;

    beforeEach(async () => {
        gameService = createStubInstance(GameService);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GameController],
            providers: [
                {
                    provide: GameService,
                    useValue: gameService,
                },
            ],
        }).compile();

        controller = module.get<GameController>(GameController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should create a game successfully', async () => {
        const createGameDto: CreateGameDto = new CreateGameDto();
        Object.assign(createGameDto, TEST_GAME);
        gameService.createGame.resolves();

        const result = await controller.createGame(createGameDto);

        expect(result).toEqual({ message: 'Game created successfully' });
        expect(gameService.createGame.calledOnceWith(createGameDto)).toBeTruthy();
    });

    it('should handle creation errors with bad request', async () => {
        const createGameDto = new CreateGameDto();
        Object.assign(createGameDto, TEST_GAME);
        const errorMessage = 'Error creating game';
        gameService.createGame.rejects(new Error(errorMessage));

        await expect(controller.createGame(createGameDto)).rejects.toThrow(
            new HttpException({ message: 'Failed to create game', error: errorMessage }, HttpStatus.BAD_REQUEST),
        );
    });

    it('should update a game successfully', async () => {
        gameService.updateGame.resolves(GAME_UPDATE as GameDocument);

        const result = await controller.updateGame(TEST_GAME_ID, GAME_UPDATE);

        expect(result).toEqual({ message: 'Game updated successfully', updatedGame: GAME_UPDATE });
        expect(gameService.updateGame.calledOnceWith(TEST_GAME_ID, GAME_UPDATE)).toBeTruthy();
    });

    it('should handle update errors with bad request', async () => {
        const errorMessage = 'Error updating game';
        gameService.updateGame.rejects(new Error(errorMessage));

        await expect(controller.updateGame(TEST_GAME_ID, GAME_UPDATE)).rejects.toThrow(
            new HttpException({ message: 'Failed to update game', error: errorMessage }, HttpStatus.BAD_REQUEST),
        );
    });

    it('should delete a game successfully', async () => {
        gameService.deleteGame.resolves(true);

        const result = await controller.deleteGame(TEST_GAME_ID);

        expect(result).toEqual({ message: `Game with id ${TEST_GAME_ID} deleted successfully` });
        expect(gameService.deleteGame.calledOnceWith(TEST_GAME_ID)).toBeTruthy();
    });

    it('should return not found if game does not exist', async () => {
        gameService.deleteGame.resolves(false);

        await expect(controller.deleteGame(TEST_GAME_ID)).rejects.toThrow(
            new HttpException({ message: 'Failed to delete game' }, HttpStatus.NOT_FOUND),
        );
    });

    it('should retrieve all games successfully', async () => {
        const mockResponse = createMockResponse();
        const testGames = [TEST_GAME, TEST_GAME];
        gameService.getGames.resolves(testGames);

        await controller.getGames(mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(STATUS_OK);
        expect(mockResponse.json).toHaveBeenCalledWith(testGames);
        expect(gameService.getGames.calledOnce).toBeTruthy();
    });

    it('should handle server errors when retrieving games', async () => {
        const mockResponse = createMockResponse();
        const errorMessage = 'Database failure';

        gameService.getGames.rejects(new Error(errorMessage));

        await controller.getGames(mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Server Error',
            error: errorMessage,
        });

        expect(gameService.getGames.calledOnce).toBeTruthy();
    });

    it('should retrieve a game by ID successfully', async () => {
        const mockResponse = createMockResponse();
        gameService.getGameById.resolves(TEST_GAME as GameDocument);

        await controller.getGame(TEST_GAME_ID, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(STATUS_OK);
        expect(mockResponse.json).toHaveBeenCalledWith(TEST_GAME);
        expect(gameService.getGameById.calledOnceWith(TEST_GAME_ID)).toBeTruthy();
    });

    it('should handle server errors when retrieving a game', async () => {
        const mockResponse = createMockResponse();
        const errorMessage = 'Test error';
        gameService.getGameById.rejects(new Error(errorMessage));

        await controller.getGame(TEST_GAME_ID, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Server Error',
            error: errorMessage,
        });
    });
});
