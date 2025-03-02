import { AccessCodesDto } from '@app/model/dto/game/access-codes.dto';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('AccessCodes')
@Controller('accessCodes')
export class AccessCodesController {
    constructor(private readonly accessCodesService: AccessCodesService) {}

    @Post('create')
    async createGame(@Body() createCodeDto: AccessCodesDto): Promise<Partial<AccessCodesDto>> {
        try {
            const game = await this.accessCodesService.createAccessCode(createCodeDto);
            return { code: game.code };
        } catch (error) {
            throw new HttpException({ message: 'Failed to create accessCode', error: error.message }, HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    async getGames(@Res() response: Response) {
        try {
            const games = await this.accessCodesService.getCodes();
            response.status(HttpStatus.OK).json(games);
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Server Error', error: error.message });
        }
    }

    @Delete(':code')
    async deleteCode(@Param('code') code: string, @Res() response: Response) {
        try {
            await this.accessCodesService.deleteCode(code);
            response.status(HttpStatus.OK).json({ message: `Access code ${code} deleted successfully` });
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete access code', error: error.message });
        }
    }
}
