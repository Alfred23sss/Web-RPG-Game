import { TileType } from '@app/model/database/tile';
import { IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ItemDto } from './item.dto'; // Import the updated ItemDto

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
    @ValidateNested() // Still validate the embedded item
    item?: ItemDto; // Directly store the full Item object
}
