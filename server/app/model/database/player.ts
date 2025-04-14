import { DiceType } from '@app/interfaces/dice';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Item } from './item';
import { TeamType } from '@common/enums';

const spawnPointSchema = new MongooseSchema({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    tileId: { type: String, required: true },
});
export type PlayerDocument = Player & Document;

@Schema()
export class Player {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    avatar: string;

    @Prop({ required: true })
    speed: number;

    @Prop({ required: true, type: Object })
    attack: { value: number; bonusDice: DiceType };

    @Prop({ required: true, type: Object })
    defense: { value: number; bonusDice: DiceType };

    @Prop({ required: true, type: Object })
    hp: { current: number; max: number };

    @Prop({ required: true })
    movementPoints: number;

    @Prop({ required: true })
    actionPoints: number;

    @Prop({ type: [Item], required: true })
    inventory: [Item | null, Item | null];

    @Prop({ required: true })
    isAdmin: boolean;

    @Prop({ required: true })
    isVirtual: boolean;

    @Prop({ required: true })
    hasAbandoned: boolean;

    @Prop({ required: true })
    isActive: boolean;

    @Prop({ required: true })
    combatWon: number;

    @Prop({
        type: spawnPointSchema,
        required: false,
    })
    spawnPoint?: {
        x: number;
        y: number;
        tileId: string;
    };

    @Prop({ required: false, enum: TeamType })
    team?: TeamType;
}

export const playerSchema = SchemaFactory.createForClass(Player);
