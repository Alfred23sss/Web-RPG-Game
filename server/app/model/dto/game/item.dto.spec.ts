import { plainToInstance } from 'class-transformer';
import { TileDto } from './tile.dto';
import { ItemDto } from './item.dto';
import { TileType } from '@app/model/database/tile';

describe('TileDto)', () => {
    const validTile: Partial<TileDto> = {
        id: 'tile-1',
        imageSrc: 'image.png',
        isOccupied: false,
        type: TileType.Default,
        isOpen: false,
        item: {
            id: 'item-1',
            imageSrc: 'item.png',
            imageSrcGrey: 'item-grey.png',
            name: 'Test Item',
            itemCounter: 0,
            description: 'Test Description',
            originalReference: {
                id: 'item-2',
                imageSrc: 'item2.png',
                imageSrcGrey: 'item2-grey.png',
                name: 'Test Item 2',
                itemCounter: 1,
                description: 'Test Description 2',
            },
        },
    };

    it('should be defined', () => {
        expect(validTile).toBeDefined();
    });

    it('should transform the item property and its originalReference to instances of ItemDto', () => {
        const tileInstance = plainToInstance(TileDto, validTile, { enableImplicitConversion: true });
        expect(tileInstance.item).toBeInstanceOf(ItemDto);
        expect(tileInstance.item.originalReference).toBeInstanceOf(ItemDto);
    });
});
