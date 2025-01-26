import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { GAME_NAME_MAX_LENGTH } from './game.dto.constants';

export class UpdateGameDto {
    @ApiProperty({ maxLength: GAME_NAME_MAX_LENGTH, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(GAME_NAME_MAX_LENGTH)
    name?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    teacher?: string;

    @ApiProperty()
    @IsString()
    subjectCode: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    credits?: number;
}
