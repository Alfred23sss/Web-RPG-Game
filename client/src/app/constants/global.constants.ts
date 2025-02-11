/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AttributeType } from '@app/enums/global.enums';
import { GameMode, GameSize } from '@app/interfaces/game';

export const BONUS_VALUE = 2;

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
    },
    diceAssigned: {
        [AttributeType.Attack]: false,
        [AttributeType.Defense]: false,
    },
};

export const ATTRIBUTE_KEYS = Object.values(AttributeType);

export const GRID_DIMENSIONS: Record<GameSize, number> = {
    [GameSize.Small]: 10,
    [GameSize.Medium]: 15,
    [GameSize.Large]: 20,
    [GameSize.None]: 0,
};

export const DEFAULT_GAME_IMAGE = 'assets/images/example.png';

export const GAME_SIZES_LIST = [
    { key: GameSize.Small, label: 'Small', info: 'Grid: 10x10, Players: 2, Items: 2' },
    { key: GameSize.Medium, label: 'Medium', info: 'Grid: 15x15, Players: 4, Items: 4' },
    { key: GameSize.Large, label: 'Large', info: 'Grid: 20x20, Players: 6, Items: 6' },
];

export const GAME_MODES_LIST = [
    {
        key: GameMode.Classic,
        label: 'Classic',
        description: 'A traditional game mode where strategy is key.',
        backgroundImage: "url('/assets/gamemodes/classic-game.png')",
    },
    {
        key: GameMode.CTF,
        label: 'Capture The Flag',
        description: "Compete to secure your opponent's flag!",
        backgroundImage: "url('/assets/gamemodes/CTF-game.png')",
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
        size: GameSize.Large,
        mode: GameMode.CTF,
        lastModified: new Date(),
        previewImage: 'image2.jpg',
        description: 'Description 2',
        grid: [],
    },
];

// export const BONUS_VALUE = 2;

// export const DICE_TYPES = {
//     D4: 'D4',
//     D6: 'D6',
// } as const;

// export const ATTRIBUTE_TYPES = {
//     VITALITY: 'vitality',
//     SPEED: 'speed',
//     ATTACK: 'attack',
//     DEFENSE: 'defense',
// };

// export const INITIAL_VALUES = {
//     attributes: {
//         [ATTRIBUTE_TYPES.VITALITY]: 4,
//         [ATTRIBUTE_TYPES.SPEED]: 4,
//         [ATTRIBUTE_TYPES.ATTACK]: 4,
//         [ATTRIBUTE_TYPES.DEFENSE]: 4,
//     },
//     bonusAssigned: {
//         [ATTRIBUTE_TYPES.VITALITY]: false,
//         [ATTRIBUTE_TYPES.SPEED]: false,
//     },
//     diceAssigned: {
//         [ATTRIBUTE_TYPES.ATTACK]: false,
//         [ATTRIBUTE_TYPES.DEFENSE]: false,
//     },
// };

// export const ATTRIBUTE_KEYS = Object.values(ATTRIBUTE_TYPES);

// // game creation pop-up
// export const GAME_SIZES = {
//     SMALL: 'small',
//     MEDIUM: 'medium',
//     LARGE: 'large',
// };

// export const GRID_DIMENSIONS = {
//     [GAME_SIZES.SMALL]: 10,
//     [GAME_SIZES.MEDIUM]: 15,
//     [GAME_SIZES.LARGE]: 20,
// };

// export const DEFAULT_GAME_IMAGE = 'assets/images/example.png';

// export const TIME_CONSTANTS = {
//     SECOND_DIVIDER: 1000,
//     SECOND_MODULO: 60,
// };

// export const GAME_MODES = {
//     CTF: 'CTF',
//     CLASSIC: 'CLASSIC',
// };

// export const GAME_SIZES_LIST = [
//     { key: GAME_SIZES.SMALL, label: 'Small', info: 'Grid: 10x10, Players: 2, Items: 2' },
//     { key: GAME_SIZES.MEDIUM, label: 'Medium', info: 'Grid: 15x15, Players: 4, Items: 4' },
//     { key: GAME_SIZES.LARGE, label: 'Large', info: 'Grid: 20x20, Players: 6, Items: 6' },
// ];

// export const GAME_MODES_LIST = [
//     {
//         key: 'Classic',
//         label: 'Classic',
//         description: 'A traditional game mode where strategy is key.',
//         backgroundImage: "url('/assets/gamemodes/classic-game.png')",
//     },
//     {
//         key: GAME_MODES.CTF,
//         label: 'Capture The Flag',
//         description: "Compete to secure your opponent's flag!",
//         backgroundImage: "url('/assets/gamemodes/CTF-game.png')",
//     },
// ];

// // global
// export const ERROR_MESSAGES = {
//     MISSING_CHARACTER_DETAILS: 'Please ensure you have assigned bonuses and dice, and entered a name and avatar.',
//     INVALID_GAME_SIZE: 'Invalid game size selected!',
//     UNAVAILABLE_GAME_MODE: 'CTF game mode is currently unavailable!',
//     MISSING_GAME_DETAILS: 'Please select both game size and game type!',
//     INVALID_GAME_MODE: 'Invalid game mode selected!',
//     UNAVAILABLE_GAME: "Le jeu n'est plus disponible.",
// };

// export const ROUTES = {
//     WAITING_VIEW: '/waiting-view',
//     EDITION_VIEW: '/edition',
//     adminPage: '/admin',
//     homePage: '/home',
//     createPage: '/create',
//     CREATE_VIEW: '/create',
// };

// export const SNACKBAR_CONFIG = {
//     DURATION: 3000,
//     ACTION: 'Close',
// };

// export const HTTP_STATUS = {
//     INTERNAL_SERVER_ERROR: 500,
//     FORBIDDEN: 403,
// };

// export const ACCESS_CODE_MIN_VALUE = 1000;
// export const ACCESS_CODE_MAX_VALUE = 9999;
// export const ACCESS_CODE_RANGE = 9000;
// export const ACCESS_CODE_LENGTH = 4;
// // eslint-disable-next-line @typescript-eslint/no-magic-numbers
// export const CODE_EDGE_CASES = [0, 0.999];

// export const MOCK_GAMES = [
//     {
//         id: '1',
//         name: 'Game 1',
//         isVisible: false,
//         size: '15',
//         mode: 'Singleplayer',
//         lastModified: new Date(),
//         previewImage: 'image1.jpg',
//         description: 'Description 1',
//         grid: [],
//     },
//     {
//         id: '2',
//         name: 'Game 2',
//         isVisible: true,
//         size: '20',
//         mode: 'Multiplayer',
//         lastModified: new Date(),
//         previewImage: 'image2.jpg',
//         description: 'Description 2',
//         grid: [],
//     },
// ];
