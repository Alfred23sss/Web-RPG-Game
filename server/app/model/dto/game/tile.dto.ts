import { TileType } from '@app/model/database/tile';
import { IsBoolean, IsEnum, IsString } from 'class-validator';

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
