import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type ItemDocument = Item & Document;

@Schema()
export class Item {
    @Prop({ required: true })
    id: string;

    @Prop({ required: true })
    imageSrc: string;

    @Prop({ required: true })
    imageSrcGrey: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    itemCounter: number;

    @Prop({ required: true })
    description: string;

    @Prop({ type: Types.ObjectId, ref: 'Item', required: false })
    originalReference?: Item;
}

export const itemSchema = SchemaFactory.createForClass(Item);
