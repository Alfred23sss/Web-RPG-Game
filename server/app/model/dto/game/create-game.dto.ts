import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsString, ValidateNested } from 'class-validator';
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
    @ValidateNested({ each: true }) // Validate each TileDto inside the array
    @Type(() => TileDto) // Use class-transformer to correctly transform the array elements into TileDto objects
    grid?: TileDto[][];
}
