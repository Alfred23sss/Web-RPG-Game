import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ItemDto {
    @IsString()
    id: string;

    @IsString()
    imageSrc: string;

    @IsString()
    imageSrcGrey: string;

    @IsString()
    name: string;

    @IsNumber()
    itemCounter: number;

    @IsString()
    description: string;

    @IsOptional()
    @ValidateNested()
    @IsObject()
    @Type(() => ItemDto)
    originalReference?: ItemDto;
}
