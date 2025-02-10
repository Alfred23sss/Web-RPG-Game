import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GameValidationService } from './game-validation.service';
import { Game, GameMode } from '@app/interfaces/game';
import { Tile, TileType } from '@app/interfaces/tile';
import { GameService } from '@app/services/game/game.service';
import { Item } from '@app/interfaces/item';

describe('GameValidationService', () => {
    let service: GameValidationService;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let snackBarMock: jasmine.SpyObj<MatSnackBar>;

    beforeEach(() => {
        gameServiceMock = jasmine.createSpyObj('GameService', ['isGameNameUsed']);
        snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

        TestBed.configureTestingModule({
            providers: [GameValidationService, { provide: GameService, useValue: gameServiceMock }, { provide: MatSnackBar, useValue: snackBarMock }],
        });

        service = TestBed.inject(GameValidationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should validate a valid grid', () => {
        const game: Game = {
            id: '5',
            name: 'Correct Game',
            description: 'Test case for complete validation',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createValidGrid(),
        };

        expect(service.validateGame(game)).toBeTrue();
        expect(snackBarMock.open).not.toHaveBeenCalled();
    });

    it('should validate a valid grid', () => {
        const game: Game = {
            id: '5',
            name: 'Correct Game',
            description: 'Test case for complete validation',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createValidGrid(),
        };

        expect(service.validateGame(game)).toBeTrue();
        expect(snackBarMock.open).not.toHaveBeenCalled();
    });

    it('should fail when doors are incorrectly placed', () => {
        const game: Game = {
            id: '1',
            name: 'Invalid Door Game',
            description: 'Doors are placed incorrectly',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridWithInvalidDoors(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ One or more doors are not correctly placed.', 'Close', { duration: 3000 });
    });

    it('should fail when terrain is less than 50%', () => {
        const game: Game = {
            id: '2',
            name: 'Invalid Terrain Game',
            description: 'Too many walls',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridWithTooManyWalls(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ Grid must be more than 50% terrain (Default, Ice or Water)', 'Close', { duration: 3000 });
    });

    it('should fail when title or description is invalid', () => {
        const game: Game = {
            id: '3',
            name: '',
            description: '',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createValidGrid(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith(
            '❌ Name must be between 1 and 30 characters and unique.\n❌ Description must not be empty and must be at most 100 characters.',
            'Close',
            { duration: 3000 },
        );
    });

    it('should fail when there are inaccessible tiles', () => {
        const game: Game = {
            id: '4',
            name: 'Inaccessible Game',
            description: 'Some terrain is unreachable',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridWithInaccessibleTiles(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ There are inaccessible tiles in the grid.', 'Close', { duration: 3000 });
    });

    it('should fail when not all items are placed', () => {
        const game: Game = {
            id: '5',
            name: 'Missing Items Game',
            description: 'Not enough items placed',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridWithMissingItems(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ All items must be placed.', 'Close', { duration: 3000 });
    });

    it('should fail when home items are missing', () => {
        const game: Game = {
            id: '6',
            name: 'Missing Home Game',
            description: 'Not enough home items placed',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridMissingHomeItems(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ 2 home items must be placed.', 'Close', { duration: 3000 });
    });

    it('should fail when flag is missing in CTF mode', () => {
        const game: Game = {
            id: '7',
            name: 'Missing Flag Game',
            description: 'No flag in Capture the Flag mode',
            size: '10',
            mode: GameMode.CTF,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createValidGrid(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ Flag must be placed on the map.', 'Close', { duration: 3000 });
    });

    it('should return an error if no grid is found', () => {
        const game: Game = {
            id: '1',
            name: 'Game Without Grid',
            description: 'This game has no grid',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: undefined,
        };
    
        const result = service.validateGame(game);
        expect(result).toBeFalse();
        
        const expectedMessage = '❌ No grid found\n❌ No grid found\n❌ No grid found\n❌ No grid found\n❌ No grid found\n❌ No grid found';
        expect(snackBarMock.open).toHaveBeenCalledWith(expectedMessage, 'Close', { duration: 3000 });
    });

    it('should return null if a flag item is placed in the grid', () => {
        const grid: Tile[][] = createValidGrid();
        grid[2][2].item = createDummyItem('flag');
    
        const game: Game = {
            id: '9',
            name: 'Flag Placed Game',
            description: 'This game has a flag placed on the grid',
            size: '10',
            mode: GameMode.CTF,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: grid,
        };
        const result = service.validateGame(game);
        expect(result).toBeTrue();
        expect(snackBarMock.open).not.toHaveBeenCalled();
    });

    it('should return an error if no accessible terrain is found', () => {
        const grid: Tile[][] = createBaseGrid(10);
        for (let i = 0; i < grid.length; i++) {
            for (let j = 0; j < grid[i].length; j++) {
                grid[i][j].type = TileType.Wall;
            }
        }
    
        const game: Game = {
            id: '10',
            name: 'No Accessible Terrain Game',
            description: 'This game has no accessible terrain',
            size: '10',
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: grid,
        };
        const result = service.validateGame(game);
        expect(result).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith(
            jasmine.stringMatching(/❌ No accessible terrain found./), 
            'Close', 
            { duration: 3000 }
        );
    });
    
    

    function createBaseGrid(size: number): Tile[][] {
        return Array.from({ length: size }, (_, rowIndex) =>
            Array.from({ length: size }, (_, colIndex) => ({
                id: `${rowIndex}-${colIndex}`,
                imageSrc: 'assets/tile-items/default.png',
                isOccupied: false,
                type: TileType.Default,
                isOpen: true,
            })),
        );
    }

    function createDummyItem(itemName: string): Item {
        return new Item({
            id: `dummy-${itemName}`,
            name: itemName,
            imageSrc: `assets/item/${itemName}.png`,
            imageSrcGrey: `assets/item/${itemName}-grey.png`,
            itemCounter: 1,
            description: `Dummy ${itemName} item`,
        });
    }

    function createValidGrid(): Tile[][] {
        const grid = createBaseGrid(10);
        grid[3][3].item = createDummyItem('home');
        grid[3][4].item = createDummyItem('home');
        grid[3][5].item = createDummyItem('question');
        grid[3][6].item = createDummyItem('question');
        grid[3][7].item = createDummyItem('swap');
        grid[3][8].item = createDummyItem('lightning');
        grid[3][9].item = createDummyItem('potion');
        grid[3][0].item = createDummyItem('fire');
        grid[3][1].item = createDummyItem('rubik');
        grid[3][2].item = createDummyItem('stop');
        return grid;
    }

    function createGridWithInvalidDoors(): Tile[][] {
        const grid = createValidGrid();
        grid[0][0].type = TileType.Door;
        return grid;
    }

    function createGridMissingHomeItems(): Tile[][] {
        const grid = createValidGrid();
        grid[3][4].item = undefined;
        return grid;
    }

    function createGridWithInaccessibleTiles(): Tile[][] {
        const grid = createValidGrid();
        grid[0][1].type = TileType.Wall;
        grid[1][0].type = TileType.Wall;
        return grid;
    }

    function createGridWithMissingItems(): Tile[][] {
        const grid = createValidGrid();
        grid[3][9].item = undefined;
        return grid;
    }

    function createGridWithTooManyWalls(): Tile[][] {
        const grid = createValidGrid();

        const numRows = grid.length;
        const numCols = grid[0].length;

        for (let i = 4; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                grid[i][j].type = TileType.Wall;
            }
        }

        return grid;
    }
});
