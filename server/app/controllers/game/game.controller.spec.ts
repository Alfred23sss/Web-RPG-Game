import { GameController } from '@app/controllers/game/game.controller';
import { GameDocument } from '@app/model/database/game';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { GameService } from '@app/services/game/game.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { createStubInstance, SinonStubbedInstance } from 'sinon';

const STATUS_OK = HttpStatus.OK;
const MOCK_GAME_ID = '1';
const MOCK_GAME = {
    id: MOCK_GAME_ID,
    name: 'Test Game',
    size: 'Large',
    mode: 'Singleplayer',
    lastModified: new Date(),
    isVisible: true,
    previewImage: 'test.png',
    description: 'A test game',
    grid: [[]],
};
const GAME_UPDATE: Partial<UpdateGameDto> = { mode: 'Singleplayer' };

const createMockResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
});

describe('GameController', () => {
    let controller: GameController;
    let gameService: SinonStubbedInstance<GameService>;

    beforeEach(async () => {
        gameService = createStubInstance(GameService);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GameController],
            providers: [{ provide: GameService, useValue: gameService }],
        }).compile();

        controller = module.get<GameController>(GameController);
    });

    it('should create a game successfully', async () => {
        const createGameDto = Object.assign(new CreateGameDto(), MOCK_GAME);
        gameService.createGame.resolves();

        await expect(controller.createGame(createGameDto)).resolves.toEqual({ message: 'Game created successfully' });
    });

    it('should handle game creation failure', async () => {
        gameService.createGame.rejects(new Error('Error creating game'));

        await expect(controller.createGame(new CreateGameDto())).rejects.toThrow(HttpException);
    });

    it('should update a game successfully', async () => {
        gameService.updateGame.resolves(GAME_UPDATE as GameDocument);

        await expect(controller.updateGame(MOCK_GAME_ID, GAME_UPDATE)).resolves.toEqual(GAME_UPDATE);
    });

    it('should throw BAD_REQUEST if game update fails or not found', async () => {
        gameService.updateGame.resolves(null);

        await expect(controller.updateGame(MOCK_GAME_ID, GAME_UPDATE)).rejects.toThrow(HttpException);
    });

    it('should delete a game successfully', async () => {
        gameService.deleteGame.resolves(true);

        await expect(controller.deleteGame(MOCK_GAME_ID)).resolves.toEqual({ message: `Game with id ${MOCK_GAME_ID} deleted successfully` });
    });

    it('should throw BAD_REQUEST if game deletion fails', async () => {
        gameService.deleteGame.resolves(false);

        await expect(controller.deleteGame(MOCK_GAME_ID)).rejects.toThrow(HttpException);
    });

    it('should retrieve all games', async () => {
        const mockResponse = createMockResponse();
        gameService.getGames.resolves([MOCK_GAME]);

        await controller.getGames(mockResponse as unknown as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(STATUS_OK);
        expect(mockResponse.json).toHaveBeenCalledWith([MOCK_GAME]);
    });

    it('should handle error when retrieving games', async () => {
        const mockResponse = createMockResponse();
        gameService.getGames.rejects(new Error('Database failure'));

        await controller.getGames(mockResponse as unknown as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should retrieve a game by ID', async () => {
        const mockResponse = createMockResponse();
        gameService.getGameById.resolves(MOCK_GAME as GameDocument);

        await controller.getGame(MOCK_GAME_ID, mockResponse as unknown as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(STATUS_OK);
        expect(mockResponse.json).toHaveBeenCalledWith(MOCK_GAME);
    });

    it('should return NOT_FOUND if game is missing or not visible', async () => {
        const mockResponse = createMockResponse();
        gameService.getGameById.resolves(null);

        await controller.getGame(MOCK_GAME_ID, mockResponse as unknown as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should return FORBIDDEN if game is not visible', async () => {
        const mockResponse = createMockResponse();
        gameService.getGameById.resolves({ ...MOCK_GAME, isVisible: false } as GameDocument);

        await controller.getGame(MOCK_GAME_ID, mockResponse as unknown as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });
});
