import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameData } from './game-data';

describe('GameData', () => {
    let gameData: GameData;

    beforeEach(() => {
        gameData = new GameData();
    });

    it('should create with default values', () => {
        expect(gameData).toBeDefined();
    });

    it('should update partial properties correctly', () => {
        const tile = { id: '1', type: 0 } as unknown as Tile;
        const mockPlayer = { name: 'TestPlayer' } as Player;

        gameData.update({
            movementPointsRemaining: 3,
            isCurrentlyMoving: true,
            playerTile: tile,
            clientPlayer: mockPlayer,
        });

        expect(gameData.movementPointsRemaining).toBe(3);
        expect(gameData.isCurrentlyMoving).toBeTrue();
        expect(gameData.playerTile).toBe(tile);
        expect(gameData.clientPlayer.name).toBe('TestPlayer');
    });
});
