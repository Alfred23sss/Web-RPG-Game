import { TileType } from '@app/model/database/tile';
import { IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ItemDto } from './item.dto';

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

    @IsOptional()
    @ValidateNested()
    item?: ItemDto;
}
