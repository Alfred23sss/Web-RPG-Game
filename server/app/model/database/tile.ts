import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { Item } from './item';
import { Player } from './player';

export type GameDocument = Tile & Document;

export enum TileType {
    Water = 'eau',
    Ice = 'glace',
    Wall = 'mur',
    Door = 'porte',
    Default = 'défaut',
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

    @ApiProperty({ type: Item })
    @Prop({ type: Item, required: false })
    item?: Item;

    @ApiProperty({ type: Player })
    @Prop({ type: Player, required: false })
    player?: Player;
}

export const tileSchema = SchemaFactory.createForClass(Tile);
