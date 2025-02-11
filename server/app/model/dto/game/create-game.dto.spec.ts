import { plainToInstance } from 'class-transformer';
import { CreateGameDto } from './create-game.dto';
import { TileType } from '@app/model/database/tile';

describe('CreateGameDto', () => {
    let validGame: CreateGameDto;

    beforeEach(() => {
        validGame = {
            id: 'game',
            name: 'Test Game',
            size: '10x10',
            mode: 'classic',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            description: 'A test game',
            grid: [
                [
                    {
                        id: 'tile-1',
                        item: {
                            id: 'item-1',
                            imageSrc: '',
                            imageSrcGrey: '',
                            name: '',
                            itemCounter: 0,
                            description: '',
                        },
                        imageSrc: '',
                        isOccupied: false,
                        type: TileType.Default,
                        isOpen: false,
                    },
                    {
                        id: 'tile-2',
                        item: null,
                        imageSrc: '',
                        isOccupied: false,
                        type: TileType.Water,
                        isOpen: false,
                    },
                ],
            ],
        };
    });

    it('should be defined', () => {
        expect(validGame).toBeDefined();
    });

    it('should transform lastModified to Date', () => {
        const transformedDto = plainToInstance(CreateGameDto, { ...validGame, lastModified: new Date() });
        expect(transformedDto.lastModified).toBeInstanceOf(Date);
    });
});
