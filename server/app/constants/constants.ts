import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { Behavior, DiceType, ItemDescription, ItemName, ItemType } from '@common/enums';
// ========================
// General Definitions
// ========================
export const ACTION_MIN_MS = 500;

export const ACTION_MAX_MS = 1500;

export const BASE_STAT = 4;

export const BONUS_STAT = 6;

export const COMBAT_TURN_DURATION = 5000;

export const COMBAT_ESCAPE_LIMITED_DURATION = 3000;

export const ESCAPE_THRESHOLD = 0.3;

export const MAX_ESCAPE_ATTEMPTS = 2;

export const PLAYER_MOVE_DELAY = 150;

export const WIN_CONDITION = 3;

export const HEALTH_CONDITION_THRESHOLD = 0.5;

export const BONUS_VALUE = 2;

export const MULTIPLIER = 1;

// ========================
// Virtual player
// ========================
export const AGGRESSIVE_ITEM_SCORE = 50;

export const ALLY_ATTACK_PENALTY = -100000;

export const ATTACK_SCORE = 100;

export const DEFENSIVE_ITEM_SCORE = 2400;

export const IN_RANGE_BONUS = 1000;

export const INVALID_ITEM_PENALTY = -10000;

export const NO_SCORE = 0;

export const PENALTY_VALUE = -1;

export const DEFAULT_VIRTUAL_PLAYER: VirtualPlayer = {
    name: '',
    avatar: '',
    speed: BASE_STAT,
    attack: { value: BASE_STAT, bonusDice: DiceType.Uninitialized },
    defense: { value: BASE_STAT, bonusDice: DiceType.Uninitialized },
    hp: { current: BASE_STAT, max: BASE_STAT },
    movementPoints: 4,
    actionPoints: 1,
    inventory: [null, null],
    isAdmin: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
    isVirtual: true,
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
    'LebronsVAD',
];

// ========================
// Items and Behavior
// ========================
export const AGGRESSIVE_ITEM_ORDER: ItemName[] = [
    ItemName.Flag,
    ItemName.BlackSword,
    ItemName.IceSword,
    ItemName.Armor,
    ItemName.IceShield,
    ItemName.GreatShield,
    ItemName.Pickaxe,
];

export const DEFENSIVE_ITEM_ORDER: ItemName[] = [
    ItemName.Flag,
    ItemName.GreatShield,
    ItemName.IceShield,
    ItemName.Armor,
    ItemName.IceSword,
    ItemName.BlackSword,
    ItemName.Pickaxe,
];

export const RANDOM_ITEMS = [
    {
        id: '0',
        name: ItemName.Pickaxe,
        imageSrc: ItemType.Pickaxe,
        imageSrcGrey: ItemType.PickaxeGray,
        itemCounter: 1,
        description: ItemDescription.Pickaxe,
    },
    {
        id: '1',
        name: ItemName.BlackSword,
        imageSrc: ItemType.BlackSword,
        imageSrcGrey: ItemType.BlackSwordGray,
        itemCounter: 1,
        description: ItemDescription.BlackSword,
    },
    {
        id: '2',
        name: ItemName.Armor,
        imageSrc: ItemType.Armor,
        imageSrcGrey: ItemType.ArmorGray,
        itemCounter: 1,
        description: ItemDescription.Armor,
    },
    {
        id: '3',
        name: ItemName.GreatShield,
        imageSrc: ItemType.GreatShield,
        imageSrcGrey: ItemType.GreatShieldGray,
        itemCounter: 1,
        description: ItemDescription.GreatShield,
    },
    {
        id: '4',
        name: ItemName.IceSword,
        imageSrc: ItemType.IceSword,
        imageSrcGrey: ItemType.IceSwordGray,
        itemCounter: 1,
        description: ItemDescription.IceSword,
    },
    {
        id: '5',
        name: ItemName.IceShield,
        imageSrc: ItemType.IceShield,
        imageSrcGrey: ItemType.IceShieldGray,
        itemCounter: 1,
        description: ItemDescription.IceShield,
    },
];

export const DOOR_ACTION_MIN_MS = 500;

export const DOOR_ACTION_MAX_MS = 1000;

export const FLAG_SCORE = 5000;

export const NORMAL_ITEM_SCORE = 1200;

export const DEFENSE_ATTACK_SCORE = 50;

export const PLAYER_POSITION = -2;

export const DESTINATION_POSITION = -1;

// ========================
// Player Turn Config
// ========================
export const ACTION_COST = 1;

export const ICE_COST = 0;

export const WATER_COST = 2;

export const DEFAULT_COST = 1;

export const DOOR_COST = 1;

export const WALL_COST = Infinity;

export const TRANSITION_PHASE_DURATION = 3000;

export const TURN_DURATION = 30000;

export const SECOND = 1000;

export const RANDOMIZER = 0.5;
