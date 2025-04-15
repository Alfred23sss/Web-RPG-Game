/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AttributeType, GameModeLabel, GameModeType } from '@app/enums/global.enums';
import { BonusAssigned, DiceAssigned } from '@app/interfaces/character-attributes';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { DiceType, GameMode, GameSize, ImageType, ItemDescription, ItemName, ItemType, TileType } from '@common/enums';

/* ========================== */
/* Attributs & Joueurs */
/* ========================== */
export const ATTRIBUTE_KEYS = Object.values(AttributeType);
export const BONUS_VALUE = 2;
export const DEFAULT_ACTION_POINTS = 1;
export const DEFAULT_ESCAPE_ATTEMPTS = 2;
export const INITIAL_VALUES = {
    attributes: {
        [AttributeType.Vitality]: 4,
        [AttributeType.Speed]: 4,
        [AttributeType.Attack]: 4,
        [AttributeType.Defense]: 4,
    },
    bonusAssigned: {
        [AttributeType.Vitality]: false,
        [AttributeType.Speed]: false,
    } as BonusAssigned,

    diceAssigned: {
        [AttributeType.Attack]: false,
        [AttributeType.Defense]: false,
    } as DiceAssigned,
};
export const NO_ACTION_POINTS = 0;

/* ========================== */
/* Données Mock & Tests */
/* ========================== */
export const MOCK_ACCESS_CODE = '1234';

export const MOCK_GRID: Tile[][] = [
    [
        { id: 'tile-0-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
        { id: 'tile-0-1', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
    ],
    [
        { id: 'tile-1-0', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
        { id: 'tile-1-1', imageSrc: ImageType.Default, isOccupied: false, type: TileType.Default, isOpen: true },
    ],
];

export const MOCK_GAME: Game = {
    id: 'testGameId',
    name: 'testGame',
    size: '10',
    mode: 'Classic',
    lastModified: new Date(),
    isVisible: false,
    previewImage: '',
    description: '',
    grid: MOCK_GRID,
};

export const MOCK_GAMES = [
    {
        id: '1',
        name: 'Game 1',
        isVisible: false,
        size: GameSize.Medium,
        mode: GameMode.Classic,
        lastModified: new Date(),
        previewImage: 'image1.jpg',
        description: 'Description 1',
        grid: [],
    },
    {
        id: '2',
        name: 'Game 2',
        isVisible: true,
        size: 'large',
        mode: 'CTF',
        lastModified: new Date(),
        previewImage: 'image2.jpg',
        description: 'Description 2',
        grid: [],
    },
];

export const DEFAULT_LOBBY: Lobby = {
    isLocked: false,
    accessCode: MOCK_ACCESS_CODE,
    players: [],
    game: MOCK_GAME,
    maxPlayers: 0,
};

export const MOCK_LOBBY = DEFAULT_LOBBY;

export const MOCK_PLAYER: Player = {
    name: 'testPlayer',
    avatar: 'testAvatar',
    speed: 4,
    attack: {
        value: 4,
        bonusDice: DiceType.D6,
    },
    defense: {
        value: 4,
        bonusDice: DiceType.D4,
    },
    hp: {
        current: 10,
        max: 10,
    },
    movementPoints: 3,
    actionPoints: 3,
    inventory: [null, null],
    isAdmin: false,
    isVirtual: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
};

export const UNINITIALIZED_PLAYER: Player = {
    name: '',
    avatar: '',
    speed: 4,
    attack: { value: 4, bonusDice: DiceType.Uninitialized },
    defense: { value: 4, bonusDice: DiceType.Uninitialized },
    hp: { current: 4, max: 4 },
    movementPoints: 4,
    actionPoints: 1,
    inventory: [null, null],
    isAdmin: false,
    isVirtual: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
};

/* ======================= */
/* Grille et Gameplay */
/* ======================= */
export const DEFAULT_GAME_IMAGE = GameModeType.Default;

export const GRID_DIMENSIONS: Record<GameSize, number> = {
    [GameSize.Small]: 10,
    [GameSize.Medium]: 15,
    [GameSize.Large]: 20,
    [GameSize.None]: 0,
};

export const GAME_MODES_LIST = [
    {
        key: GameMode.Classic,
        label: GameModeLabel.Classic,
        description: 'Un mode de jeu traditionnel où la stratégie est la clé.',
        backgroundImage: `url('${GameModeType.Classic}')`,
    },
    {
        key: GameMode.CTF,
        label: GameModeLabel.CTF,
        description: 'Rivalisez pour sécuriser le drapeau de votre adversaire !',
        backgroundImage: `url('${GameModeType.CTF}')`,
    },
];

export const GAME_SIZES_LIST = [
    { key: GameSize.Small, label: 'Petit', info: 'Grille: 10x10, Joeurs: 2, Items: 2' },
    { key: GameSize.Medium, label: 'Moyen', info: 'Grille: 15x15, Joeurs: 4, Items: 4' },
    { key: GameSize.Large, label: 'Large', info: 'Grille: 20x20, Joueurs: 6, Items: 6' },
];

export const SIZE_MAPPING: Record<'size10' | 'size15' | 'size20', GameSize> = {
    size10: GameSize.Small,
    size15: GameSize.Medium,
    size20: GameSize.Large,
};

/* ================= */
/* Items du jeu */
/* ================= */
export const ITEM_BAR_ITEMS = [
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
    {
        id: '6',
        name: ItemName.Home,
        imageSrc: ItemType.Home,
        imageSrcGrey: ItemType.HomeGray,
        itemCounter: 2,
        description: ItemDescription.Home,
    },
    {
        id: '7',
        name: ItemName.Chest,
        imageSrc: ItemType.Chest,
        imageSrcGrey: ItemType.ChestGray,
        itemCounter: 1,
        description: ItemDescription.Chest,
    },
    {
        id: '8',
        name: ItemName.Flag,
        imageSrc: ItemType.Flag,
        imageSrcGrey: ItemType.FlagGray,
        itemCounter: 1,
        description: ItemDescription.Flag,
    },
];

export const ITEM_COUNTS: Record<GameSize, number> = {
    [GameSize.Small]: 2,
    [GameSize.Medium]: 4,
    [GameSize.Large]: 6,
    [GameSize.None]: 0,
};

export const ITEMS_TO_UPDATE = new Set(['home']);



export const ESCAPE_CHANCE = 0.3;

export const DELAY_BEFORE_ENDING_GAME = 5000;

export const DELAY_BEFORE_HOME = 2000;

export const DELAY_MESSAGE_AFTER_COMBAT_ENDED = 3000;

export const NO_ESCAPES_TIMER = 3;

export const POPUP_DELAY = 2000;

/* ======================== */
/* Clés de stockage */
/* ======================== */
export const GAME_STORAGE = 'game';

export const LOBBY_STORAGE = 'lobby';

export const ORDERED_PLAYERS_STORAGE = 'orderedPlayers';

export const PLAYER_STORAGE = 'player';

export const REFRESH_STORAGE = 'refreshed';

/* ============================== */
/* Configuration des codes */
/* ============================== */
export const ACCESS_CODE_MIN_VALUE = 1000;

export const ACCESS_CODE_MAX_VALUE = 9999;

export const ACCESS_CODE_RANGE = 9000;

export const ACCESS_CODE_LENGTH = 4;

export const CODE_EDGE_CASES = [0, 0.999];

/* ====================== */
/* UI & Config divers */
/* ====================== */
export const KEY_DOWN_EVENT_LISTENER = 'keydown';

export const MAX_GAMES_SHOWN = 3;

export const MIN_PLAYERS = 2;

export const SNACKBAR_CONFIG = {
    duration: 3000,
    action: 'Close',
};
