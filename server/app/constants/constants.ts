import { Behavior, DiceType, ItemDescription, ItemName, ItemType } from '@app/enums/enums';
import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';

export const RANDOM_ITEMS = [
    {
        id: '0',
        name: ItemName.Lightning,
        imageSrc: ItemType.Lightning,
        imageSrcGrey: ItemType.LightningGray,
        itemCounter: 1,
        description: ItemDescription.Lightning,
    },
    {
        id: '1',
        name: ItemName.Potion,
        imageSrc: ItemType.Potion,
        imageSrcGrey: ItemType.PotionGray,
        itemCounter: 1,
        description: ItemDescription.Potion,
    },
    {
        id: '2',
        name: ItemName.Rubik,
        imageSrc: ItemType.Rubik,
        imageSrcGrey: ItemType.RubikGray,
        itemCounter: 1,
        description: ItemDescription.Rubik,
    },
    {
        id: '3',
        name: ItemName.Stop,
        imageSrc: ItemType.Stop,
        imageSrcGrey: ItemType.StopGray,
        itemCounter: 1,
        description: ItemDescription.Stop,
    },
    {
        id: '4',
        name: ItemName.Fire,
        imageSrc: ItemType.Fire,
        imageSrcGrey: ItemType.FireGray,
        itemCounter: 1,
        description: ItemDescription.Fire,
    },
    {
        id: '5',
        name: ItemName.Swap,
        imageSrc: ItemType.Swap,
        imageSrcGrey: ItemType.SwapGray,
        itemCounter: 1,
        description: ItemDescription.Swap,
    },
];

export const BASE_STAT = 4;
export const BONUS_STAT = 6;
export const VP_ACTION_WAIT_TIME_MS = 3000;
export const DOOR_ACTION_WAIT_TIME_MS = 500;
export const VP_TURN_DONE_MS = 1000;
export const ATTACK_SCORE = 100;
export const NO_SCORE = 0;
export const AGGRESSIVE_ITEM_SCORE = 50;
export const IN_RANGE_BONUS = 1000;
export const INVALID_ITEM_PENALTY = -10000;
export const PLAYER_POSITION = -2;
export const DESTINATION_POSITION = -1;
export const ACTION_COST = 1;

export const ICE_COST = 0;
export const WATER_COST = 2;
export const DEFAULT_COST = 1;
export const DOOR_COST = 1;
export const WALL_COST = Infinity;

export const DEFAULT_VIRTUAL_PLAYER: VirtualPlayer = {
    name: '',
    avatar: '',
    speed: BASE_STAT,
    vitality: BASE_STAT, // Add the missing "vitality" field from Player
    attack: { value: BASE_STAT, bonusDice: DiceType.Uninitialized },
    defense: { value: BASE_STAT, bonusDice: DiceType.Uninitialized },
    hp: { current: BASE_STAT, max: BASE_STAT },
    movementPoints: 4,
    actionPoints: 1,
    inventory: [null, null],
    isAdmin: false, // Always false for virtual players
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
    isVirtual: true, // Always true for virtual players
    behavior: Behavior.Null,
};

export const VIRTUAL_PLAYER_NAMES: string[] = [
    'BaguetteMan',
    'FromageNinja',
    'CroissantFurtif',
    'Escargodzilla',
    'Jean-Michel Bot',
    'Tartiflex',
    'RacletteOP',
    'PoutinePower',
    'MacaronFou',
    'OmeletteDuRisk',
];
