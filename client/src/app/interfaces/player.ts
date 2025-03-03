import { Item } from '@app/classes/item';
import { DiceType } from '@app/enums/global.enums';

export interface Player {
    name: string;
    avatar: string;
    speed: number;
    vitality: number;
    attack: { value: number; bonusDice: DiceType };
    defense: { value: number; bonusDice: DiceType };
    hp: { current: number; max: number };
    movementPoints: number;
    actionPoints: number;
    inventory: [Item | null, Item | null];
    isAdmin: boolean;
}

export interface PlayerInfo {
    name: string;
    avatar: string;
    speed: number;
    vitality: number;
    attack: { value: number; bonusDice: DiceType };
    defense: { value: number; bonusDice: DiceType };
    hp: { current: number; max: number };
    movementPoints: number;
    actionPoints: number;
    inventory: [Item | null, Item | null];
    isAdmin: boolean;
}
