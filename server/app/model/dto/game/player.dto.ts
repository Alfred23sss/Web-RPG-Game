import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DiceType } from '@app/interfaces/Dice';
import { ItemDto } from './item.dto';

export class PlayerDto {
    @IsString()
    name: string;

    @IsString()
    avatar: string;

    @IsNumber()
    speed: number;

    @IsNumber()
    vitality: number;

    @IsOptional()
    @ValidateNested()
    attack: { value: number; bonusDice: DiceType };

    @IsOptional()
    @ValidateNested()
    defense: { value: number; bonusDice: DiceType };

    @IsOptional()
    @ValidateNested()
    hp: { current: number; max: number };

    @IsNumber()
    movementPoints: number;

    @IsNumber()
    actionPoints: number;

    @IsOptional()
    @ValidateNested()
    inventory: [ItemDto | null, ItemDto | null];

    @IsBoolean()
    isAdmin: boolean;

    @IsBoolean()
    hasAbandoned: boolean;

    @IsBoolean()
    isActive: boolean;

    @IsNumber()
    combatWon: number;

    @IsOptional()
    @ValidateNested()
    spawnPoint?: { x: number; y: number; tileId: string } | undefined;
}
