import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlayerDto } from './player.dto';

describe('PlayerDto', () => {
    it('should fail validation if required fields are missing', async () => {
        const invalidPlayer = {
            avatar: 'avatar1.png',
            speed: 'fast',
            isAdmin: 'yes',
        };

        const playerInstance = plainToInstance(PlayerDto, invalidPlayer);
        const errors = await validate(playerInstance);

        expect(errors.length).toBeGreaterThan(0);
    });
});
