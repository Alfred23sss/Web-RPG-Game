import { GameController } from '@app/controllers/game/game.controller';
import { GameDocument } from '@app/model/database/game';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { GameService } from '@app/services/game/game.service';
import { HttpStatus } from '@nestjs/common';
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
const RESPONSE = { status: jest.fn().mockReturnThis(), json: jest.fn() };
const GAME_UPDATE: Partial<UpdateGameDto> = { mode: 'Singleplayer' };

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

    it('createGame() should call GameService.createGame()', async () => {
        const createGameDto: CreateGameDto = new CreateGameDto();
        Object.assign(createGameDto, TEST_GAME);
        gameService.createGame.resolves();

        const result = await controller.createGame(createGameDto);

        expect(result).toEqual({ message: 'Game created successfully' });
        expect(gameService.createGame.calledOnceWith(createGameDto)).toBeTruthy();
    });

    it('createGame() should handle errors and return a bad request', async () => {
        const createGameDto: CreateGameDto = new CreateGameDto();
        Object.assign(createGameDto, TEST_GAME);

        const errorMessage = 'Error creating game';
        gameService.createGame.rejects(new Error(errorMessage));

        const result = await controller.createGame(createGameDto);

        expect(result).toEqual({
            message: 'Failed to create game',
            error: errorMessage,
        });
        expect(gameService.createGame.calledOnceWith(createGameDto)).toBeTruthy();
    });

    it('updateGame() should call GameService.updateGame()', async () => {
        gameService.updateGame.resolves(GAME_UPDATE as GameDocument);

        const result = await controller.updateGame(TEST_GAME_ID, GAME_UPDATE);

        expect(result).toEqual({ message: 'Game updated successfully', updatedGame: GAME_UPDATE });
        expect(gameService.updateGame.calledOnceWith(TEST_GAME_ID, GAME_UPDATE)).toBeTruthy();
    });

    it('updateGame() should handle errors and return a bad request', async () => {
        const errorMessage = 'Error updating game';
        gameService.updateGame.rejects(new Error(errorMessage));

        const result = await controller.updateGame(TEST_GAME_ID, GAME_UPDATE);

        expect(result).toEqual({
            message: 'Failed to update game',
            error: errorMessage,
        });
        expect(gameService.updateGame.calledOnceWith(TEST_GAME_ID, GAME_UPDATE)).toBeTruthy();
    });

    it('deleteGame() should call GameService.deleteGame()', async () => {
        gameService.deleteGame.resolves(true);

        const result = await controller.deleteGame(TEST_GAME_ID);

        expect(result).toEqual({ message: `Game with id ${TEST_GAME_ID} deleted successfully` });
        expect(gameService.deleteGame.calledOnceWith(TEST_GAME_ID)).toBeTruthy();
    });

    it('deleteGame() should handle errors and return a bad request', async () => {
        const errorMessage = 'Error deleting game';
        gameService.deleteGame.rejects(new Error(errorMessage));

        const result = await controller.deleteGame(TEST_GAME_ID);

        expect(result).toEqual({
            message: 'Failed to delete game',
            error: errorMessage,
        });
        expect(gameService.deleteGame.calledOnceWith(TEST_GAME_ID)).toBeTruthy();
    });

    it('deleteGame() should return not found if the game does not exist', async () => {
        gameService.deleteGame.resolves(false);

        const result = await controller.deleteGame(TEST_GAME_ID);

        expect(result).toEqual({ message: `Game with id ${TEST_GAME_ID} not found` });
        expect(gameService.deleteGame.calledOnceWith(TEST_GAME_ID)).toBeTruthy();
    });

    it('getGames() should call GameService.getGames()', async () => {
        const testGames = [TEST_GAME, TEST_GAME];

        gameService.getGames.resolves(testGames);

        await controller.getGames(RESPONSE as unknown as Response);

        expect(RESPONSE.status).toHaveBeenCalledWith(STATUS_OK);
        expect(RESPONSE.json).toHaveBeenCalledWith(testGames);
        expect(gameService.getGames.calledOnce).toBeTruthy();
    });

    it('getGame() should call GameService.getGameById() and return the game', async () => {
        gameService.getGameById.resolves(TEST_GAME as GameDocument);

        await controller.getGame(TEST_GAME_ID, RESPONSE as unknown as Response);

        expect(RESPONSE.status).toHaveBeenCalledWith(STATUS_OK);
        expect(RESPONSE.json).toHaveBeenCalledWith(TEST_GAME);
        expect(gameService.getGameById.calledOnceWith(TEST_GAME_ID)).toBeTruthy();
    });

    it('getGame() should handle errors and return 500 status', async () => {
        const errorMessage = 'Test error';
        gameService.getGameById.rejects(new Error(errorMessage));

        await controller.getGame(TEST_GAME_ID, RESPONSE as unknown as Response);

        expect(RESPONSE.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(RESPONSE.json).toHaveBeenCalledWith({
            message: 'Server Error',
            error: errorMessage,
        });
    });
});
