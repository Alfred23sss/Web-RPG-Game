import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { Item } from './item';

export type GameDocument = Tile & Document;

export enum TileType {
    Water = 'water',
    Ice = 'ice',
    Wall = 'wall',
    Door = 'door',
    Default = 'default',
}

@Schema()
export class Tile {
    @ApiProperty()
    @Prop({ required: true })
    id: string;

    @ApiProperty()
    @Prop({ required: true })
    imageSrc: string;

    @ApiProperty()
    @Prop({ required: true, default: false })
    isOccupied: boolean;

    @ApiProperty({ enum: TileType })
    @Prop({ required: true, enum: TileType, default: TileType.Default })
    type: TileType;

    @ApiProperty()
    @Prop({ required: true, default: false })
    isOpen: boolean;

    @ApiProperty({ type: () => Item }) // Store the full Item object, not just the reference
    @Prop({ type: Item, required: false }) // Change from ObjectId reference to embedded object
    item?: Item;
}

export const tileSchema = SchemaFactory.createForClass(Tile);
