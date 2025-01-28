import { TileType } from '@app/model/database/game';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateGameDto {
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
    grid?: { id: string; imageSrc: string; isOccupied: boolean; type: TileType; isOpen: boolean }[][];
}
