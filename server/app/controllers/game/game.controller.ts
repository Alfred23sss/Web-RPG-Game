import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { GameService } from '@app/services/game/game.service';
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Patch, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Games')
@Controller('games')
export class GameController {
    constructor(private readonly gameService: GameService) {}

    @Post('create')
    async createGame(@Body() createGameDto: CreateGameDto): Promise<{ message: string }> {
        try {
            await this.gameService.createGame(createGameDto);
            return { message: 'Game created successfully' };
        } catch (error) {
            throw new HttpException({ message: 'Failed to create game', error: error.message }, HttpStatus.BAD_REQUEST);
        }
    }

    @Patch('update/:id')
    async updateGame(@Param('id') id: string, @Body() game: Partial<UpdateGameDto>) {
        try {
            const updatedGame = await this.gameService.updateGame(id, game);
            if (!updatedGame) {
                throw new HttpException(`Game with id ${id} not found`, HttpStatus.NOT_FOUND);
            }
            return updatedGame;
        } catch (error) {
            throw new HttpException({ message: 'Failed to update game', error: error.message }, HttpStatus.BAD_REQUEST);
        }
    }

    @Delete('delete/:id')
    async deleteGame(@Param('id') id: string) {
        try {
            const result = await this.gameService.deleteGame(id);
            if (!result) {
                throw new HttpException(`Game with id ${id} not found`, HttpStatus.NOT_FOUND);
            }
            return { message: `Game with id ${id} deleted successfully` };
        } catch (error) {
            throw new HttpException({ message: 'Failed to delete game', error: error.message }, HttpStatus.BAD_REQUEST);
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
    async getGame(@Body() id: string, @Res() response: Response) {
        try {
            const game = await this.gameService.getGameById(id);
            response.status(HttpStatus.OK).json(game);
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Server Error',
                error: error.message,
            });
        }
    }
}
