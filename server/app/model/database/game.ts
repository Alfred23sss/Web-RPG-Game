import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

@Schema()
export class Tile {
    @ApiProperty()
    @Prop({ required: true })
    id: string; // Replace `value` with `id`

    @ApiProperty()
    @Prop({ required: true })
    imageSrc: string; // Add `imageSrc`

    @ApiProperty()
    @Prop({ required: true })
    isOccupied: boolean; // Replace `isActive` with `isOccupied`

    @ApiProperty()
    @Prop({ required: true })
    type: string; // Add `type`

    @ApiProperty()
    @Prop({ required: true })
    isOpen: boolean; // Add `isOpen`
}

export const TileSchema = SchemaFactory.createForClass(Tile);

@Schema()
export class Game {
    @ApiProperty()
    @Prop({ required: true })
    name: string;

    @ApiProperty()
    @Prop({ required: true })
    size: string;

    @ApiProperty()
    @Prop({ required: true })
    mode: string;

    @ApiProperty()
    @Prop({ required: true })
    lastModified: Date;

    @ApiProperty()
    @Prop({ required: true })
    isVisible: boolean;

    @ApiProperty()
    @Prop({ required: true })
    previewImage: string;

    @ApiProperty()
    @Prop({ required: true })
    description: string;

    @ApiProperty({ type: () => [[Tile]], required: false })
    @Prop({
        type: [[TileSchema]],
        required: false,
        default: [],
        validate: {
            validator: (grid: Tile[][]) => Array.isArray(grid) && grid.every((row) => Array.isArray(row)),
            message: 'Grid must be a 2D array of tiles',
        },
    })
    @ValidateNested({ each: true })
    @Type(() => Tile)
    grid?: Tile[][];
}

export const gamesSchema = SchemaFactory.createForClass(Game);
