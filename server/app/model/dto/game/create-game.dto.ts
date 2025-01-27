import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

//Explication: Permet de verifier que Game est bel et bien la bonne structure

export class TileDto {
    @ApiProperty()
    @IsString()
    value: string;

    @ApiProperty()
    @IsBoolean()
    isActive: boolean;
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
    @Type(() => Date)
    lastModified: Date;

    @ApiProperty()
    @IsBoolean()
    isVisible: boolean;

    @ApiProperty()
    @IsUrl()
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
