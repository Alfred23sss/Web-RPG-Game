import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TileDto } from './tile.dto';

export class UpdateGameDto {
    @IsOptional()
    @IsString()
    id: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    size?: string;

    @IsOptional()
    @IsString()
    mode?: string;

    @IsOptional()
    lastModified?: Date;

    @IsOptional()
    @IsBoolean()
    isVisible?: boolean;

    @IsOptional()
    @IsString()
    previewImage?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true }) // Validate each TileDto inside the array
    @Type(() => TileDto) // Use class-transformer to correctly transform the array elements into TileDto objects
    grid?: TileDto[][];
}
