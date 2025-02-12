import { Game, gameSchema } from '@app/model/database/game';
import { Item, itemSchema } from '@app/model/database/item';
import { TileType } from '@app/model/database/tile';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { GameService } from '@app/services/game/game.service';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';

describe('GameService', () => {
    let service: GameService;
    let gameModel: Model<Game>;
    let itemModel: Model<Item>;
    let mongoServer: MongoMemoryServer;
    let connection: Connection;

    const MOCK_GAME_ID = '1';
    const MOCK_ITEM = {
        id: '3',
        imageSrc: 'imageSrc.png',
        imageSrcGrey: 'imageSrcGrey.png',
        name: 'test item',
        itemCounter: 0,
        description: 'A test item',
        originalReference: null,
    };
    const MOCK_TILE = {
        id: '2',
        imageSrc: 'imageSrc.png',
        isOccupied: false,
        type: TileType.Default,
        isOpen: true,
        item: MOCK_ITEM,
    };
    const MOCK_GAME_DATA = {
        id: MOCK_GAME_ID,
        name: 'Test Game',
        size: 'Large',
        mode: 'Singleplayer',
        lastModified: new Date(),
        isVisible: true,
        previewImage: 'test.png',
        description: 'A test game',
        grid: [[MOCK_TILE]],
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRoot(mongoServer.getUri()),
                MongooseModule.forFeature([
                    { name: Game.name, schema: gameSchema },
                    { name: Item.name, schema: itemSchema },
                ]),
            ],
            providers: [GameService],
        }).compile();

        service = module.get<GameService>(GameService);
        gameModel = module.get<Model<Game>>(getModelToken(Game.name));
        itemModel = module.get<Model<Item>>(getModelToken(Item.name));
        connection = module.get(getConnectionToken());
    });

    afterEach(async () => {
        await gameModel.deleteMany({});
        await itemModel.deleteMany({});
    });

    afterAll(async () => {
        await connection.close();
        await mongoServer.stop();
    });

    it('should initialize dependencies correctly', () => {
        expect(service).toBeDefined();
        expect(gameModel).toBeDefined();
        expect(itemModel).toBeDefined();
    });

    it('should reject duplicate game names', async () => {
        await gameModel.create(MOCK_GAME_DATA);
        await expect(service.createGame(MOCK_GAME_DATA as CreateGameDto)).rejects.toThrow(`Game with name "${MOCK_GAME_DATA.name}" already exists.`);
    });

    it('should handle database errors during creation', async () => {
        jest.spyOn(gameModel, 'create').mockRejectedValueOnce(new Error('Database error'));
        await expect(service.createGame(MOCK_GAME_DATA as CreateGameDto)).rejects.toThrow('Failed to create game: Database error');
    });

    it('should handle tiles without items during creation', async () => {
        const gameWithoutItems = {
            ...MOCK_GAME_DATA,
            grid: [[{ ...MOCK_TILE, item: undefined }]],
        };

        const createdGame = await service.createGame(gameWithoutItems);
        expect(createdGame.grid[0][0].item).toBeUndefined();
    });

    it('should remove an existing game from the database', async () => {
        const game = await gameModel.create(MOCK_GAME_DATA);
        await expect(service.deleteGame(game.id)).resolves.toBe(true);

        const [byMongoId, byCustomId] = await Promise.all([gameModel.findById(game._id), gameModel.findOne({ id: game.id })]);
        expect(byMongoId).toBeNull();
        expect(byCustomId).toBeNull();
    });

    it('should handle non-existent games gracefully during deletion', async () => {
        await expect(service.deleteGame('invalid-id')).resolves.toBe(false);
    });

    it('should propagate database errors during deletion', async () => {
        jest.spyOn(gameModel, 'deleteOne').mockReturnValueOnce({
            exec: jest.fn().mockRejectedValueOnce(new Error('Database error')),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        await expect(service.deleteGame(MOCK_GAME_ID)).rejects.toThrow('Failed to delete game: Database error');
    });

    it('should fetch a game with populated items', async () => {
        const item = await itemModel.create(MOCK_ITEM);
        const game = await gameModel.create({
            ...MOCK_GAME_DATA,
            grid: [[{ ...MOCK_TILE, item: { ...MOCK_ITEM, _id: item._id } }]],
        });

        const result = await service.getGameById(game.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result.grid[0][0].item as any).toObject()).toMatchObject({
            _id: item._id,
            name: MOCK_ITEM.name,
            description: MOCK_ITEM.description,
        });
    });

    it('should throw for non-existent games during retrieval', async () => {
        await expect(service.getGameById('invalid-id')).rejects.toThrow('Game not found');
    });

    it('should fetch all games', async () => {
        await gameModel.create([MOCK_GAME_DATA, MOCK_GAME_DATA]);
        const games = await service.getGames();
        expect(games).toHaveLength(2);
    });

    it('should handle errors during fetching games', async () => {
        jest.spyOn(gameModel, 'find').mockRejectedValueOnce(new Error('Database error'));
        await expect(service.getGames()).rejects.toThrow('Failed to fetch games: Database error');
    });

    it('should apply partial updates', async () => {
        const game = await gameModel.create(MOCK_GAME_DATA);
        const result = await service.updateGame(game.id, { id: game.id, name: 'Updated' });
        expect(result.name).toBe('Updated');
    });

    it('should transform grid items during update', async () => {
        const game = await gameModel.create(MOCK_GAME_DATA);
        const update = { id: game.id, grid: MOCK_GAME_DATA.grid };
        const result = await service.updateGame(game.id, update);
        expect(result.grid[0][0].item).toEqual(
            expect.objectContaining({
                name: MOCK_ITEM.name,
                description: MOCK_ITEM.description,
            }),
        );
    });

    it('should validate updates and propagate validation errors', async () => {
        const game = await gameModel.create(MOCK_GAME_DATA);
        jest.spyOn(gameModel, 'findOneAndUpdate').mockRejectedValueOnce(new Error('Validation failed'));
        await expect(service.updateGame(game.id, { size: 1 } as unknown)).rejects.toThrow('Failed to update game: Validation failed');
    });

    it('should handle mixed item states in the grid during update', async () => {
        const existingGame = await gameModel.create(MOCK_GAME_DATA);
        const update = {
            id: existingGame.id,
            grid: [[MOCK_TILE, { ...MOCK_TILE, id: 'new-tile', item: undefined }]],
        };
        const result = await service.updateGame(existingGame.id, update);
        expect(result.grid[0][0].item).toBeDefined();
        expect(result.grid[0][1].item).toBeUndefined();
    });

    it('should reject invalid grid structures during update', async () => {
        const existingGame = await gameModel.create(MOCK_GAME_DATA);
        const invalidUpdate = {
            id: existingGame.id,
            grid: [['invalid-row' as unknown as typeof MOCK_TILE]],
        };
        await expect(service.updateGame(existingGame.id, invalidUpdate)).rejects.toThrow();
        await expect(service.updateGame('invalid-id', {} as UpdateGameDto)).rejects.toThrow('Game with id "invalid-id" not found.');
    });

    it('should handle non-existent games during update', async () => {
        await expect(service.updateGame('invalid-id', {} as UpdateGameDto)).rejects.toThrow('Game with id "invalid-id" not found.');
    });

    it('should handle non-array rows in grid during update', async () => {
        const game = await gameModel.create(MOCK_GAME_DATA);
        const invalidUpdate: UpdateGameDto = {
            id: game.id,
            grid: [
                [
                    {
                        id: 'tile',
                        imageSrc: 'test.png',
                        isOccupied: false,
                        type: TileType.Default,
                        isOpen: true,
                        item: {
                            ...MOCK_ITEM,
                            id: 'item',
                        },
                    },
                ],
                'invalidRow' as unknown as (typeof MOCK_TILE)[],
            ],
        };

        await expect(service.updateGame(game.id, invalidUpdate)).rejects.toThrow();
        const updatedGame = await gameModel.findById(game._id);
        expect(updatedGame).not.toBeNull();
    });

    it('should use all UpdateGameDto properties', async () => {
        const game = await gameModel.create(MOCK_GAME_DATA);
        const updateData = new UpdateGameDto();
        updateData.name = 'Updated Name';

        const result = await service.updateGame(game.id, updateData);
        expect(result.name).toBe('Updated Name');
    });
});
