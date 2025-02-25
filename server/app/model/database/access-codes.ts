import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

export type AccessCodesDocument = AccessCodes & Document;

@Schema()
export class AccessCodes {
    @ApiProperty()
    @Prop({ required: true, unique: true })
    code: string;
}

export const accessCodesSchema = SchemaFactory.createForClass(AccessCodes);
