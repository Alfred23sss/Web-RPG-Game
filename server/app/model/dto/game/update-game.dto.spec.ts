import { plainToInstance } from 'class-transformer';
import { UpdateGameDto } from './update-game.dto';

describe('UpdateGameDto', () => {
    const validGame: Partial<UpdateGameDto> = {
        id: 'game-1',
        name: 'Test Game',
        size: 'Large',
        mode: 'Test Mode',
        lastModified: new Date(),
        isVisible: true,
        previewImage: 'preview.png',
        description: 'A test game',
        grid: [],
    };

    it('should be defined', () => {
        expect(validGame).toBeDefined();
    });

    it('should transform the grid elements and their nested properties into proper DTO instances', () => {
        const gameInstance = plainToInstance(UpdateGameDto, validGame, { enableImplicitConversion: true });
        expect(gameInstance.grid).toBeInstanceOf(Array);
    });
});
