export const BONUS_VALUE = 2;

export const DICE_TYPES = {
    d4: 'D4',
    d6: 'D6',
} as const;

export const ATTRIBUTE_TYPES = {
    vitality: 'vitality',
    speed: 'speed',
    attack: 'attack',
    defense: 'defense',
};

export const INITIAL_VALUES = {
    attributes: {
        [ATTRIBUTE_TYPES.vitality]: 4,
        [ATTRIBUTE_TYPES.speed]: 4,
        [ATTRIBUTE_TYPES.attack]: 4,
        [ATTRIBUTE_TYPES.defense]: 4,
    },
    bonusAssigned: {
        [ATTRIBUTE_TYPES.vitality]: false,
        [ATTRIBUTE_TYPES.speed]: false,
    },
    diceAssigned: {
        [ATTRIBUTE_TYPES.attack]: false,
        [ATTRIBUTE_TYPES.defense]: false,
    },
};

export const ATTRIBUTE_KEYS = Object.values(ATTRIBUTE_TYPES);

// game creation pop-up
export const GAME_SIZES = {
    small: 'small',
    medium: 'medium',
    large: 'large',
};

export const GRID_DIMENSIONS = {
    [GAME_SIZES.small]: 10,
    [GAME_SIZES.medium]: 15,
    [GAME_SIZES.large]: 20,
};

export const DEFAULT_GAME_IMAGE = 'assets/images/example.png';

export const TIME_CONSTANTS = {
    secondDivider: 1000,
    secondModulo: 60,
};

export const GAME_MODES = {
    ctf: 'CTF',
    classic: 'CLASSIC',
};

export const GAME_SIZES_LIST = [
    { key: GAME_SIZES.small, label: 'Small', info: 'Grid: 10x10, Players: 2, Items: 2' },
    { key: GAME_SIZES.medium, label: 'Medium', info: 'Grid: 15x15, Players: 4, Items: 4' },
    { key: GAME_SIZES.large, label: 'Large', info: 'Grid: 20x20, Players: 6, Items: 6' },
];

export const GAME_MODES_LIST = [
    {
        key: 'Classic',
        label: 'Classic',
        description: 'A traditional game mode where strategy is key.',
        backgroundImage: "url('/assets/gamemodes/classic-game.png')",
    },
    {
        key: GAME_MODES.ctf,
        label: 'Capture The Flag',
        description: "Compete to secure your opponent's flag!",
        backgroundImage: "url('/assets/gamemodes/CTF-game.png')",
    },
];

// global
export const ERROR_MESSAGES = {
    MISSING_CHARACTER_DETAILS: 'Please ensure you have assigned bonuses and dice, and entered a name and avatar.',
    INVALID_GAME_SIZE: 'Invalid game size selected!',
    UNAVAILABLE_GAME_MODE: 'CTF game mode is currently unavailable!',
    MISSING_GAME_DETAILS: 'Please select both game size and game type!',
    INVALID_GAME_MODE: 'Invalid game mode selected!',
    UNAVAILABLE_GAME: "Le jeu n'est plus disponible.",
};

export const ROUTES = {
    WAITING_VIEW: '/waiting-view',
    EDITION_VIEW: '/edition',
    adminPage: '/admin',
    homePage: '/home',
    createPage: '/create',
    CREATE_VIEW: '/create',
};

export const SNACKBAR_CONFIG = {
    DURATION: 3000,
    ACTION: 'Close',
};

export const HTTP_STATUS = {
    INTERNAL_SERVER_ERROR: 500,
    forbidden: 403,
};

export const ACCESS_CODE_MIN_VALUE = 1000;
export const ACCESS_CODE_MAX_VALUE = 9999;
export const ACCESS_CODE_RANGE = 9000;
export const ACCESS_CODE_LENGTH = 4;
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const CODE_EDGE_CASES = [0, 0.999];

export const MOCK_GAMES = [
    {
        id: '1',
        name: 'Game 1',
        isVisible: false,
        size: '15',
        mode: 'Singleplayer',
        lastModified: new Date(),
        previewImage: 'image1.jpg',
        description: 'Description 1',
        grid: [],
    },
    {
        id: '2',
        name: 'Game 2',
        isVisible: true,
        size: '20',
        mode: 'Multiplayer',
        lastModified: new Date(),
        previewImage: 'image2.jpg',
        description: 'Description 2',
        grid: [],
    },
];
