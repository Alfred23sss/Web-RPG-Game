import { TileType } from '@app/model/database/tile';
import { Type } from 'class-transformer';
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
    @ValidateNested() // Validate the nested ItemDto
    @Type(() => ItemDto) // Use class-transformer to properly handle the nested DTO
    item?: ItemDto; // Reference to an entire Item object (optional)
}
