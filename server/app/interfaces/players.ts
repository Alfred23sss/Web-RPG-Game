import { DiceType } from '@app/interfaces/dices';
import { Item } from '@app/interfaces/items';
import { TeamType } from '@common/enums';

export interface Player {
    name: string;
    avatar: string;
    speed: number;
    attack: { value: number; bonusDice: DiceType };
    defense: { value: number; bonusDice: DiceType };
    hp: { current: number; max: number };
    movementPoints: number;
    actionPoints: number;
    inventory: [Item | null, Item | null];
    isAdmin: boolean;
    isVirtual: boolean;
    hasAbandoned: boolean;
    isActive: boolean;
    combatWon: number;
    spawnPoint?: { x: number; y: number; tileId: string } | undefined;
    team?: TeamType;
}
