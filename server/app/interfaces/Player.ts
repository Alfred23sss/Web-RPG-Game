import { DiceType } from '@app/interfaces/Dice';
import { Item } from '@app/interfaces/Item';

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
    hasAbandoned: boolean;
    isActive: boolean;
    combatWon: number;
}
