import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MaxLength } from 'class-validator';
import { GAME_NAME_MAX_LENGTH } from './game.dto.constants';

export class CreateGameDto {
    @ApiProperty({ maxLength: GAME_NAME_MAX_LENGTH })
    @IsString()
    @MaxLength(GAME_NAME_MAX_LENGTH)
    name: string;

    @ApiProperty()
    @IsString()
    teacher: string;

    @ApiProperty()
    @IsString()
    subjectCode: string;

    @ApiProperty()
    @IsNumber()
    credits: number;
}
