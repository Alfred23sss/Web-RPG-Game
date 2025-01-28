import { Game } from '@app/model/database/game';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { GameService } from '@app/services/game/game.service';
import { Body, Controller, Get, HttpException, HttpStatus, Post, Put, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Games')
@Controller('games')
export class GameController {
    constructor(private readonly gameService: GameService) {}

    @Post()
    async createGame(@Body() createGameDto: CreateGameDto): Promise<{ message: string }> {
        try {
            await this.gameService.createGame(createGameDto);
            return { message: 'Game created successfully' };
        } catch (error) {
            throw new HttpException({ message: 'Failed to create game', error: error.message }, HttpStatus.BAD_REQUEST);
        }
    }

    @Put()
    async updateGame(@Body() gameName: string, data: Partial<Game>) {
        try {
            await this.gameService.updateGame(gameName, data);
            return { message: 'Game updated successfully' };
        } catch (error) {
            throw new HttpException({ message: 'Failed to update image', error: error.message }, HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    async getGames(@Res() response: Response) {
        try {
            const games = await this.gameService.getGames();
            response.status(HttpStatus.OK).json(games);
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Server Error',
                error: error.message,
            });
        }
    }

    @Get()
    async getGame(@Body() gameName: string, @Res() response: Response) {
        try {
            const game = await this.gameService.getGameByName(gameName);
            response.status(HttpStatus.OK).json(game);
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Server Error',
                error: error.message,
            });
        }
    }
}
