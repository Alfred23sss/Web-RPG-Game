/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AttributeType } from '@app/enums/global.enums';
import { GameMode, GameSize } from '@app/interfaces/game';

export const BONUS_VALUE = 2;

// doit sortir de const mettre dans interface
interface BonusAssigned {
    [AttributeType.Vitality]: boolean;
    [AttributeType.Speed]: boolean;
}

interface DiceAssigned {
    [AttributeType.Attack]: boolean;
    [AttributeType.Defense]: boolean;
}

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

export const DEFAULT_GAME_IMAGE = 'assets/images/example.png';

export const GAME_SIZES_LIST = [
    { key: GameSize.Small, label: 'Petit', info: 'Grille: 10x10, Joeurs: 2, Items: 2' },
    { key: GameSize.Medium, label: 'Moyen', info: 'Grille: 15x15, Joeurs: 4, Items: 4' },
    { key: GameSize.Large, label: 'Large', info: 'Grille: 20x20, Joueurs: 6, Items: 6' },
];

export const GAME_MODES_LIST = [
    {
        key: GameMode.Classic,
        label: 'Classique',
        description: 'Un mode de jeu traditionnel où la stratégie est la clé.',
        backgroundImage: "url('/assets/gamemodes/classic-game.png')",
    },
    {
        key: GameMode.CTF,
        label: 'Capture Le Drapeau',
        description: 'Rivalisez pour sécuriser le drapeau de votre adversaire !',
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
        size: 'medium',
        mode: 'Classic',
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
