/* eslint-disable @typescript-eslint/no-magic-numbers */ // needed to justify the numbers, but they are explained with the constant's name
import { AttributeType, GameModeLabel, GameModeType } from '@app/enums/global.enums';
import { BonusAssigned, DiceAssigned } from '@app/interfaces/character-attributes';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { DiceType, GameMode, GameSize, ImageType, ItemDescription, ItemName, ItemType, TileType } from '@common/enums';
export const BONUS_VALUE = 2;
export const MAX_GAMES_SHOWN = 3;
export const POPUP_DELAY = 2000;
export const NO_ACTION_POINTS = 0;
export const DEFAULT_ACTION_POINTS = 1;
export const DELAY_BEFORE_HOME = 2000;
export const DELAY_BEFORE_ENDING_GAME = 5000;
export const DEFAULT_ESCAPE_ATTEMPTS = 2;
export const DELAY_MESSAGE_AFTER_COMBAT_ENDED = 3000;
export const EVENTS = [
    'abandonGame',
    'gameDeleted',
    'gameEnded',
    'transitionStarted',
    'turnStarted',
    'timerUpdate',
    'alertGameStarted',
    'playerMovement',
    'gameCombatStarted',
    'attackResult',
    'playerUpdate',
    'playerListUpdate',
    'doorClickedUpdate',
    'gameCombatTurnStarted',
    'gameCombatTimerUpdate',
    'gridUpdate',
    'noMoreEscapesLeft',
    'combatEnded',
    'adminModeChangedServerSide',
];

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

export const ATTRIBUTE_KEYS = Object.values(AttributeType);

export const GRID_DIMENSIONS: Record<GameSize, number> = {
    [GameSize.Small]: 10,
    [GameSize.Medium]: 15,
    [GameSize.Large]: 20,
    [GameSize.None]: 0,
};

export const DEFAULT_GAME_IMAGE = GameModeType.Default;

export const GAME_SIZES_LIST = [
    { key: GameSize.Small, label: 'Petit', info: 'Grille: 10x10, Joeurs: 2, Items: 2' },
    { key: GameSize.Medium, label: 'Moyen', info: 'Grille: 15x15, Joeurs: 4, Items: 4' },
    { key: GameSize.Large, label: 'Large', info: 'Grille: 20x20, Joueurs: 6, Items: 6' },
];

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

export const SNACKBAR_CONFIG = {
    duration: 3000,
    action: 'Close',
};

export const ACCESS_CODE_MIN_VALUE = 1000;
export const ACCESS_CODE_MAX_VALUE = 9999;
export const ACCESS_CODE_RANGE = 9000;
export const ACCESS_CODE_LENGTH = 4;
export const CODE_EDGE_CASES = [0, 0.999];
export const MIN_PLAYERS = 2;

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

export const ESCAPE_CHANCE = 0.3;
export const NO_ESCAPES_TIMER = 3;

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

export const ITEM_BAR_ITEMS = [
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
        name: ItemName.QuestionMark,
        imageSrc: ItemType.QuestionMark,
        imageSrcGrey: ItemType.QuestionMarkGray,
        itemCounter: 1,
        description: ItemDescription.QuestionMark,
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

export const PLAYER_STORAGE = 'player';
export const LOBBY_STORAGE = 'lobby';
export const GAME_STORAGE = 'game';
export const ORDERED_PLAYERS_STORAGE = 'orderedPlayers';

export const REFRESH_STORAGE = 'refreshed';
export const KEY_DOWN_EVENT_LISTENER = 'keydown';

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

export const MOCK_ACCESS_CODE = 'testCode';

export const DEFAULT_LOBBY: Lobby = {
    isLocked: false,
    accessCode: MOCK_ACCESS_CODE,
    players: [],
    game: MOCK_GAME,
    maxPlayers: 0,
};

export const sizeMapping: Record<'size10' | 'size15' | 'size20', GameSize> = {
    size10: GameSize.Small,
    size15: GameSize.Medium,
    size20: GameSize.Large,
};

export const MOCK_LOBBY = DEFAULT_LOBBY;
