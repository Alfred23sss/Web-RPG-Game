import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { Tile, tileSchema } from './tile';

export type GameDocument = Game & Document;

@Schema()
export class Game {
    @ApiProperty()
    @Prop({ required: true })
    id: string;

    @ApiProperty()
    @Prop({ required: false })
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
    @Prop({ required: false })
    previewImage: string;

    @ApiProperty()
    @Prop({ required: true })
    description: string;

    @ApiProperty({
        type: () => Tile,
        isArray: true,
        description: 'A two-dimensional grid of tiles',
    })
    @Prop({ type: [[tileSchema]], required: true })
    grid: Tile[][];
}

export const gameSchema = SchemaFactory.createForClass(Game);

// comon module maybe
