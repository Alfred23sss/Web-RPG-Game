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
    @ValidateNested() // Validate the nested ItemDto
    @IsObject() // Ensure that originalReference is an object
    @Type(() => ItemDto) // Use class-transformer to properly handle the nested DTO
    originalReference?: ItemDto; // This will be an actual Item object (optional)
}
