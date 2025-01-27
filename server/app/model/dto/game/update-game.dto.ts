import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

export class TileDto {
    @ApiProperty()
    @IsString()
    value: string;

    @ApiProperty()
    @IsBoolean()
    isActive: boolean;
}

export class UpdateGameDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    size?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    mode?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    lastModified?: Date;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isVisible?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUrl()
    previewImage?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ type: () => [[TileDto]], required: false })
    @ValidateNested({ each: true })
    @Type(() => TileDto)
    @IsOptional()
    grid?: TileDto[][];
}
