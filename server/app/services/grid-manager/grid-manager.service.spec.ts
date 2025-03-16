import { Test, TestingModule } from '@nestjs/testing';
import { GridManagerService } from './grid-manager.service';
import { Logger } from '@nestjs/common';
import { Tile, TileType } from '@app/model/database/tile';

describe('GridManagerService', () => {
    let service: GridManagerService;
    let mockGrid: Tile[][];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [GridManagerService, Logger],
        }).compile();

        service = module.get<GridManagerService>(GridManagerService);
        mockGrid = [
            [{ id: 'tile-0-0', imageSrc: 'img1', isOccupied: false, type: TileType.Default, isOpen: false }],
            [{ id: 'tile-1-0', imageSrc: 'img2', isOccupied: false, type: TileType.Default, isOpen: false }],
        ];
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should find a tile by its ID', () => {
        const tile = service.findTileById(mockGrid, 'tile-1-0');
        expect(tile).toBeDefined();
        expect(tile?.id).toBe('tile-1-0');
    });
});
