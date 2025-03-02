import { DiceType } from '@app/interfaces/Dice';
import { Item } from '@app/interfaces/Item';

export interface Player {
    playerInfo: PlayerInfo;
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
