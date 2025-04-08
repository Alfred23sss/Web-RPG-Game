import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TileDto } from './tile.dto';
import { TileType } from '@app/model/database/tile';

describe('TileDto', () => {
    it('should validate a correct TileDto instance', async () => {
        const validTile = {
            id: 'tile1',
            imageSrc: 'tile1.png',
            isOccupied: false,
            type: TileType.Default,
            isOpen: true,
            item: { name: 'Sword', description: 'A sharp sword' },
            player: {
                name: 'JohnDoe',
                avatar: 'avatar.png',
                speed: 10,
                isAdmin: false,
                isActive: true,
                hasAbandoned: false,
                combatWon: 0,
                movementPoints: 5,
                actionPoints: 3,
            },
        };

        const tileInstance = plainToInstance(TileDto, validTile);
        const errors = await validate(tileInstance);

        expect(errors.length).toBe(0);
    });

    it('should fail validation if required fields are missing or incorrect', async () => {
        const invalidTile = {
            id: '',
            imageSrc: 'tile1.png',
            isOccupied: 'false',
            type: 'InvalidType',
            isOpen: true,
        };

        const tileInstance = plainToInstance(TileDto, invalidTile);
        const errors = await validate(tileInstance);

        expect(errors.length).toBeGreaterThan(0);
    });
});
