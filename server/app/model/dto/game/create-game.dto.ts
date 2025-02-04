import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsString } from 'class-validator';
import { TileDto } from './tile.dto';

export class CreateGameDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    size: string;

    @IsString()
    mode: string;

    @ApiProperty()
    @IsDate()
    @Transform(({ value }) => new Date(value))
    lastModified: Date;

    @IsBoolean()
    isVisible: boolean;

    @IsString()
    previewImage: string;

    @IsString()
    description: string;

    @IsArray()
    grid: TileDto[][];
}
