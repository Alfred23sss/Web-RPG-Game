import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

export enum GameMode {
    Classic = 'Classic',
    CTF = 'CTF',
    None = '',
}

export enum GameSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
    None = '',
}

export enum TileType {
    Water = 'water',
    Ice = 'ice',
    Wall = 'wall',
    Door = 'door',
    Default = 'default',
}

export enum ImageType {
    Water = 'assets/images/water.png',
    Wall = 'assets/images/wall.png',
    OpenDoor = 'assets/images/porte-ouverte.png',
    ClosedDoor = 'assets/images/porte-ferme.png',
    Ice = 'assets/images/ice.png',
    Default = 'assets/images/clay.png',
}

@Schema()
export class Tile {
    @ApiProperty()
    @Prop({ required: true })
    id: string;

    @ApiProperty()
    @Prop({ type: String, enum: ImageType, required: true })
    imageSrc: ImageType;

    @ApiProperty()
    @Prop({ required: true })
    isOccupied: boolean;

    @ApiProperty({ enum: TileType })
    @Prop({ type: String, enum: TileType, required: true })
    type: TileType;

    @ApiProperty()
    @Prop({ required: true })
    isOpen: boolean;
}

export const TileSchema = SchemaFactory.createForClass(Tile);

@Schema()
export class Game {
    @ApiProperty()
    @Prop({ required: true })
    name: string;

    @ApiProperty({ enum: GameSize })
    @Prop({ type: String, enum: GameSize, required: true })
    size: GameSize;

    @ApiProperty({ enum: GameMode })
    @Prop({ type: String, enum: GameMode, required: true })
    mode: GameMode;

    @ApiProperty()
    @Prop({ required: true })
    lastModified: Date;

    @ApiProperty()
    @Prop({ required: true })
    isVisible: boolean;

    @ApiProperty()
    @Prop({ required: true })
    previewImage: string; // path to image

    @ApiProperty()
    @Prop({ required: true })
    description: string;

    @ApiProperty({
        type: () => [[Tile]],
        isArray: true,
        required: false,
    })
    @Prop({ type: [[Tile]], required: false })
    @ValidateNested({ each: true })
    @Type(() => Tile)
    grid?: Tile[][]; // Tile grid (optional)
}

export const gamesSchema = SchemaFactory.createForClass(Game);
