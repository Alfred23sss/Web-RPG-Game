import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString, ValidateNested } from 'class-validator';

//Explication: Permet de verifier que Game est bel et bien la bonne structure

export class TileDto {
    @ApiProperty()
    @IsString()
    id: string; // Replace `value` with `id`

    @ApiProperty()
    @IsString()
    imageSrc: string; // Add `imageSrc`

    @ApiProperty()
    @IsBoolean()
    isOccupied: boolean; // Replace `isActive` with `isOccupied`

    @ApiProperty()
    @IsString()
    type: string; // Add `type`

    @ApiProperty()
    @IsBoolean()
    isOpen: boolean; // Add `isOpen`
}

export class CreateGameDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    size: string;

    @ApiProperty()
    @IsString()
    mode: string;

    @ApiProperty()
    @IsDate()
    @Transform(({ value }) => new Date(value))
    lastModified: Date;

    @ApiProperty()
    @IsBoolean()
    isVisible: boolean;

    @ApiProperty()
    @IsString()
    previewImage: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty({ type: () => [[TileDto]], required: false })
    @ValidateNested({ each: true })
    @Type(() => TileDto)
    @IsOptional()
    grid?: TileDto[][];
}
