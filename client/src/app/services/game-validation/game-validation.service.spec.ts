/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable max-len */
/* eslint-disable max-lines */

import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Item } from '@app/classes/item';
import { ErrorMessages, GameMode, GameSize, TileType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Tile } from '@app/interfaces/tile';
import { GameService } from '@app/services/game/game.service';
import { GameValidationService } from './game-validation.service';

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
            size: GameSize.Small,
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
            size: GameSize.Small,
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
            size: GameSize.Small,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridWithInvalidDoors(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ Une ou plusieurs portes ne sont pas correctement placées', 'Close', { duration: 10000 });
    });

    it('should fail when terrain is less than 50%', () => {
        const game: Game = {
            id: '2',
            name: 'Invalid Terrain Game',
            description: 'Too many walls',
            size: GameSize.Small,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridWithTooManyWalls(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ La grille doit être au moins 50% de terrain (Défaut, eau ou glace)', 'Close', {
            duration: 10000,
        });
    });

    it('should fail when title or description is invalid', () => {
        const game: Game = {
            id: '3',
            name: '',
            description: '',
            size: GameSize.Small,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createValidGrid(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith(
            '❌ Le nom doit être entre 1 et 30 caractères uniques\n❌La description ne peut être vide et doit être de moins de 100 caractères',
            'Close',
            { duration: 10000 },
        );
    });

    it('should fail when there are inaccessible tiles', () => {
        const game: Game = {
            id: '4',
            name: 'Inaccessible Game',
            description: 'Some terrain is unreachable',
            size: GameSize.Small,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridWithInaccessibleTiles(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ Il y a des tuiles inaccesseibles sur le terrain', 'Close', { duration: 10000 });
    });

    it('should fail when not all items are placed', () => {
        const game: Game = {
            id: '5',
            name: 'Missing Items Game',
            description: 'Not enough items placed',
            size: GameSize.Small,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridWithMissingItems(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ Tous les items doivent être placées', 'Close', { duration: 10000 });
    });

    it('should fail when home items are missing', () => {
        const game: Game = {
            id: '6',
            name: 'Missing Home Game',
            description: 'Not enough home items placed',
            size: GameSize.Small,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createGridMissingHomeItems(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ 2 items maisons doivent être placées', 'Close', { duration: 10000 });
    });

    it('should fail when flag is missing in CTF mode', () => {
        const game: Game = {
            id: '7',
            name: 'Missing Flag Game',
            description: 'No flag in Capture the Flag mode',
            size: GameSize.Small,
            mode: GameMode.CTF,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createValidGrid(),
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ Le drapeau doit être placé sur la grille', 'Close', { duration: 10000 });
    });

    it('should return an error if no grid is found', () => {
        const game: Game = {
            id: '1',
            name: 'Game Without Grid',
            description: 'This game has no grid',
            size: GameSize.Small,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: undefined,
        };

        const result = service.validateGame(game);
        expect(result).toBeFalse();

        const expectedMessage =
            '❌ Aucune grille trouvée\n❌ Aucune grille trouvée\n❌ Aucune grille trouvée\n❌ Aucune grille trouvée\n❌ Aucune grille trouvée\n❌ Aucune grille trouvée';
        expect(snackBarMock.open).toHaveBeenCalledWith(expectedMessage, 'Close', { duration: 10000 });
    });

    it('should return null if a flag item is placed in the grid', () => {
        const grid: Tile[][] = createValidGrid();
        grid[2][2].item = createDummyItem('flag');

        const game: Game = {
            id: '9',
            name: 'Flag Placed Game',
            description: 'This game has a flag placed on the grid',
            size: GameSize.Small,
            mode: GameMode.CTF,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid,
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
            size: GameSize.Small,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid,
        };
        const result = service.validateGame(game);
        expect(result).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith(jasmine.stringMatching(/❌ Aucune tuile de terrain accessible trouvée/), 'Close', {
            duration: 10000,
        });
    });

    it('should validate a valid medium grid', () => {
        const game: Game = {
            id: '11',
            name: 'Jeu Moyen Valide',
            description: 'Cas de test pour une grille moyenne valide',
            size: GameSize.Medium,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createMediumValidGrid(),
        };

        expect(service.validateGame(game)).toBeTrue();
        expect(snackBarMock.open).not.toHaveBeenCalled();
    });

    it('should validate a valid large grid', () => {
        const game: Game = {
            id: '12',
            name: 'Jeu Grand',
            description: 'Cas de test pou',
            size: GameSize.Large,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid: createLargeValidGrid(),
        };

        expect(service.validateGame(game)).toBeTrue();
        expect(snackBarMock.open).not.toHaveBeenCalled();
    });

    it('should fail when home items are missing in a medium grid', () => {
        const grid = createMediumValidGrid();
        grid[1][8].item = undefined;

        const game: Game = {
            id: '13',
            name: 'Jeu Moyen',
            description: 'Il manque un item',
            size: GameSize.Medium,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid,
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ 4 items maisons doivent être placées', 'Close', { duration: 10000 });
    });

    it('should fail when home items are missing in a large grid', () => {
        const grid = createLargeValidGrid();
        grid[1][2].item = undefined;

        const game: Game = {
            id: '14',
            name: 'Jeu Grand',
            description: 'Il manque un ',
            size: GameSize.Large,
            mode: GameMode.Classic,
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'image.png',
            grid,
        };

        expect(service.validateGame(game)).toBeFalse();
        expect(snackBarMock.open).toHaveBeenCalledWith('❌ 6 items maisons doivent être placées', 'Close', { duration: 10000 });
    });

    it('Should fail when door is not placed correctly', () => {
        const grid = [
            [{ type: TileType.Default }, { type: TileType.Default }, { type: TileType.Default }],
            [{ type: TileType.Default }, { type: TileType.Door }, { type: TileType.Default }],
            [{ type: TileType.Default }, { type: TileType.Default }, { type: TileType.Default }],
        ];
        const game = { grid, size: GameSize.Small } as Game;
        const result = service['validateDoorPosition'](game);
        expect(result).toContain('❌ Une ou plusieurs portes ne sont pas correctement placées');
    });

    it('should fail when terrain proportion is not sufficient in validateHalfTerrain', () => {
        const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ type: TileType.Wall })));
        const game = { grid, size: GameSize.Small } as Game;
        const result = service['validateHalfTerrain'](game);
        expect(result).toContain('❌ La grille doit être au moins 50% de terrain (Défaut, eau ou glace)');
    });

    it('performBFS should return an empty tab if game.grid is undefined', () => {
        const bfsResult = service['performBFS']({ grid: undefined } as Game, 0, 0);
        expect(bfsResult).toEqual([]);
    });

    it('checkForInaccessible should return an empty tab if game.grid is undefined', () => {
        const result = service['checkForInaccessible']({ grid: undefined } as Game, []);
        expect(result).toEqual([]);
    });

    it('hasTerrainOnOtherAxis should return false if both axes are doors or walls', () => {
        const grid = [
            [{ type: TileType.Wall }, { type: TileType.Wall }, { type: TileType.Wall }],
            [{ type: TileType.Wall }, { type: TileType.Door }, { type: TileType.Wall }],
            [{ type: TileType.Wall }, { type: TileType.Wall }, { type: TileType.Wall }],
        ];
        const game = { grid } as Game;
        const result = service['hasTerrainOnOtherAxis'](game, 1, 1);
        expect(result).toBeFalse();
    });

    it('should mark door as not correctly placed when doors or walls on axis', () => {
        const grid: unknown[][] = [
            [
                { type: TileType.Default, isOccupied: false, imageSrc: 'dummy', isOpen: true },
                { type: TileType.Wall, isOccupied: false, imageSrc: 'dummy', isOpen: true },
                { type: TileType.Default, isOccupied: false, imageSrc: 'dummy', isOpen: true },
            ],
            [
                { type: TileType.Wall, isOccupied: false, imageSrc: 'dummy', isOpen: true },
                { type: TileType.Door, isOccupied: false, imageSrc: 'dummy', isOpen: true },
                { type: TileType.Wall, isOccupied: false, imageSrc: 'dummy', isOpen: true },
            ],
            [
                { type: TileType.Default, isOccupied: false, imageSrc: 'dummy', isOpen: true },
                { type: TileType.Wall, isOccupied: false, imageSrc: 'dummy', isOpen: true },
                { type: TileType.Default, isOccupied: false, imageSrc: 'dummy', isOpen: true },
            ],
        ];
        const game: Game = { grid, size: GameSize.Small } as Game;

        const errors = service['validateDoorPosition'](game);

        expect(errors).toContain('❌ Une ou plusieurs portes ne sont pas correctement placées');
    });

    it('findAccessibleStart should return null if grid is undefined', () => {
        const game: Game = { grid: undefined } as Game;
        const start = service['findAccessibleStart'](game);
        expect(start).toBeNull();
    });

    it('findAccessibleStart should return null if the grid is empty', () => {
        const game: Game = { grid: [] } as unknown as Game;
        const start = service['findAccessibleStart'](game);
        expect(start).toBeNull();
    });

    it('checkForInaccessible should return empty if the first line of the grid is empty', () => {
        const game: Game = { grid: [[]] } as unknown as Game;
        const result = service['checkForInaccessible'](game, []);
        expect(result).toEqual([]);
    });

    it('ValidateItemCount should return error message items not placed if missing items', () => {
        const grid: Tile[][] = createValidGrid();
        grid[3][9].item = undefined;
        const game: Game = {
            id: 'game-small',
            size: GameSize.Small,
            grid: grid,
        } as Game;

        const result = service['validateItemCount'](game);

        expect(result).toBe(ErrorMessages.ItemsNotPlaced);
    });

    it('ValidateItemCount should return error message if too many items placed if too many items', () => {
        const grid: Tile[][] = createValidGrid();
        grid[2][9].item = createDummyItem('test');
        const game: Game = {
            id: 'game-small',
            size: GameSize.Small,
            grid: grid,
        } as Game;

        const result = service['validateItemCount'](game);

        expect(result).toBe(ErrorMessages.TooManyItemsPlaced);
    });

    function createBaseGrid(size: number): Tile[][] {
        return Array.from({ length: size }, (_, rowIndex) =>
            Array.from({ length: size }, (_, colIndex) => ({
                id: `${rowIndex}-${colIndex}`,
                imageSrc: './assets/tile-items/default.png',
                isOccupied: false,
                type: TileType.Default,
                isOpen: true,
            })),
        );
    }

    it('should return an error when the door does not have walls on the same axis', () => {
        const grid = [
            [{ type: TileType.Wall }, { type: TileType.Wall }, { type: TileType.Wall }],
            [{ type: TileType.Default }, { type: TileType.Door }, { type: TileType.Default }],
            [{ type: TileType.Wall }, { type: TileType.Default }, { type: TileType.Wall }],
        ];
        const game = { grid } as Game;

        const errors = service['validateDoorPosition'](game);

        expect(errors).toContain('❌ Une ou plusieurs portes ne sont pas correctement placées');
    });

    it('should return an error when the door does not have walls on the same axis', () => {
        const grid = [
            [{ type: TileType.Wall }, { type: TileType.Default }, { type: TileType.Wall }],
            [{ type: TileType.Wall }, { type: TileType.Door }, { type: TileType.Default }],
            [{ type: TileType.Wall }, { type: TileType.Default }, { type: TileType.Wall }],
        ];
        const game = { grid } as Game;

        const errors = service['validateDoorPosition'](game);

        expect(errors).toContain('❌ Une ou plusieurs portes ne sont pas correctement placées');
    });

    function createDummyItem(itemName: string): Item {
        return new Item({
            id: `dummy-${itemName}`,
            name: itemName,
            imageSrc: `./assets/item/${itemName}.png`,
            imageSrcGrey: `./assets/item/${itemName}-grey.png`,
            itemCounter: 1,
            description: `Dummy ${itemName} item`,
        });
    }

    function createValidGrid(): Tile[][] {
        const grid = createBaseGrid(10);
        grid[3][3].item = createDummyItem('home');
        grid[3][4].item = createDummyItem('home');
        grid[3][9].item = createDummyItem('question');
        grid[3][2].item = createDummyItem('stop');
        return grid;
    }

    function createMediumValidGrid(): Tile[][] {
        const grid = createBaseGrid(15);
        grid[3][3].item = createDummyItem('home');
        grid[3][4].item = createDummyItem('home');
        grid[1][8].item = createDummyItem('home');
        grid[1][9].item = createDummyItem('home');
        grid[3][9].item = createDummyItem('potion');
        grid[3][0].item = createDummyItem('fire');
        grid[3][1].item = createDummyItem('rubik');
        grid[3][2].item = createDummyItem('stop');
        return grid;
    }

    function createLargeValidGrid(): Tile[][] {
        const grid = createBaseGrid(20);
        grid[3][3].item = createDummyItem('home');
        grid[3][4].item = createDummyItem('home');
        grid[1][8].item = createDummyItem('home');
        grid[1][9].item = createDummyItem('home');
        grid[1][2].item = createDummyItem('home');
        grid[1][3].item = createDummyItem('home');
        grid[3][5].item = createDummyItem('question');
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
