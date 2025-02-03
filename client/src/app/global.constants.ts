export const ACCESS_CODE_MIN_VALUE = 1000;
export const ACCESS_CODE_MAX_VALUE = 9999;
export const ACCESS_CODE_RANGE = 9000;
export const ACCESS_CODE_LENGTH = 4;
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export const CODE_EDGE_CASES = [0, 0.999];
export const mockGame = {
    id: '0',
    name: 'Test Game',
    size: 'large',
    description: 'Test Description',
    grid: [[]],
    isVisible: true,
    lastModified: new Date(),
    mode: 'Classic',
    previewImage: 'image',
};
