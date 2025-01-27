import { TileType } from '@app/model/database/game';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsEnum, IsString } from 'class-validator';

export class TileDto {
    @IsString()
    id: string;

    @IsString()
    imageSrc: string;

    @IsBoolean()
    isOccupied: boolean;

    @IsEnum(TileType)
    type: TileType;

    @IsBoolean()
    isOpen: boolean;
}

export class CreateGameDto {
    @IsString()
    name: string;

    @IsString()
    size: string;

    @IsString()
    mode: string;

    @ApiProperty({ type: Date })
    @IsDate()
    @Type(() => Date)
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
