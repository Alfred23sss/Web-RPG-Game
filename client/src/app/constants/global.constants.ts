export const DICE_TYPES = {
    D4: 'D4',
    D6: 'D6',
} as const;

export const ATTRIBUTE_TYPES = {
    VITALITY: 'vitality',
    SPEED: 'speed',
    ATTACK: 'attack',
    DEFENSE: 'defense',
};

export const INITIAL_VALUES = {
    attributes: {
        [ATTRIBUTE_TYPES.VITALITY]: 4,
        [ATTRIBUTE_TYPES.SPEED]: 4,
        [ATTRIBUTE_TYPES.ATTACK]: 4,
        [ATTRIBUTE_TYPES.DEFENSE]: 4,
    },
    bonusAssigned: {
        [ATTRIBUTE_TYPES.VITALITY]: false,
        [ATTRIBUTE_TYPES.SPEED]: false,
    },
    diceAssigned: {
        [ATTRIBUTE_TYPES.ATTACK]: false,
        [ATTRIBUTE_TYPES.DEFENSE]: false,
    },
};

export const ATTRIBUTE_KEYS = Object.values(ATTRIBUTE_TYPES);

// game creation pop-up
export const GAME_SIZES = {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
};

export const GRID_DIMENSIONS = {
    [GAME_SIZES.SMALL]: 10,
    [GAME_SIZES.MEDIUM]: 15,
    [GAME_SIZES.LARGE]: 20,
};

export const DEFAULT_GAME_IMAGE = 'assets/images/example.png';

export const TIME_CONSTANTS = {
    SECOND_DIVIDER: 1000,
    SECOND_MODULO: 60,
};

export const GAME_MODES = {
    CTF: 'CTF',
    CLASSIC: 'CLASSIC',
};

export const GAME_SIZES_LIST = [
    { key: GAME_SIZES.SMALL, label: 'Small', info: 'Grid: 10x10, Players: 2, Items: 2' },
    { key: GAME_SIZES.MEDIUM, label: 'Medium', info: 'Grid: 15x15, Players: 4, Items: 4' },
    { key: GAME_SIZES.LARGE, label: 'Large', info: 'Grid: 20x20, Players: 6, Items: 6' },
];

export const GAME_MODES_LIST = [
    {
        key: 'Classic',
        label: 'Classic',
        description: 'A traditional game mode where strategy is key.',
        backgroundImage: "url('/assets/gamemodes/classic-game.png')",
    },
    {
        key: GAME_MODES.CTF,
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
};

export const ROUTES = {
    WAITING_VIEW: '/waiting-view',
    EDITION_VIEW: '/edition',
    CREATE_VIEW: '/create'
};

export const SNACKBAR_CONFIG = {
    DURATION: 3000,
    ACTION: 'Close',
};
