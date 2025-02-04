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
