/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/lobby';
import { Move } from '@app/interfaces/move';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerActionsService } from './virtual-player-actions.service';
import { TeamType, ItemName, DiceType, TileType } from '@common/enums';

describe('VirtualPlayerActionsService', () => {
    let service: VirtualPlayerActionsService;
    let mockPlayerMovementService: jest.Mocked<PlayerMovementService>;
    let mockEventEmitter: jest.Mocked<EventEmitter2>;
    let mockGameCombatService: jest.Mocked<GameCombatService>;
    let mockGridManagerService: jest.Mocked<GridManagerService>;
    let mockGameSessionService: jest.Mocked<GameSessionService>;

    const createMockPlayer = (overrides?: Partial<Player>): Player => ({
        name: 'test-player',
        avatar: './assets/avatars/skeletonA_Idle.gif',
        speed: 1,
        attack: { value: 4, bonusDice: DiceType.D4 },
        defense: { value: 4, bonusDice: DiceType.D6 },
        hp: { current: 10, max: 10 },
        movementPoints: 5,
        actionPoints: 3,
        inventory: [null, null],
        isAdmin: false,
        isVirtual: true,
        hasAbandoned: false,
        isActive: true,
        combatWon: 0,
        team: TeamType.RED,
        ...overrides,
    });

    const createMockTile = (overrides?: Partial<Tile>): Tile => ({
        id: 'tile-0-0',
        imageSrc: './assets/tile-items/floorB.PNG',
        isOccupied: false,
        type: TileType.Default,
        isOpen: true,
        ...overrides,
    });

    const createMockMove = (overrides?: Partial<Move>): Move => ({
        tile: createMockTile(),
        inRange: true,
        type: MoveType.Attack,
        score: 0,
        ...overrides,
    });

    const createMockLobby = (overrides?: Partial<Lobby>): Lobby => ({
        isLocked: false,
        accessCode: '1234',
        game: {
            grid: [[createMockTile()]],
            mode: 'Classic',
            id: '',
            name: 'mockGame',
            size: '15x15',
            lastModified: undefined,
            isVisible: true,
            previewImage: '',
            description: '',
        },
        players: [createMockPlayer()],
        maxPlayers: 4,
        waitingPlayers: [],
        ...overrides,
    });

    beforeEach(async () => {
        mockPlayerMovementService = {
            quickestPath: jest.fn(),
            getMoveCost: jest.fn(),
            findBestMoveTile: jest.fn(),
            findClosestReachableTile: jest.fn(),
            getFarthestReachableTile: jest.fn(),
            trimPathAtObstacle: jest.fn(),
            hasAdjacentTileType: jest.fn(),
            hasAdjacentPlayerOrDoor: jest.fn(),
            getNeighbors: jest.fn(),
        } as unknown as jest.Mocked<PlayerMovementService>;

        mockEventEmitter = {
            emit: jest.fn(),
        } as unknown as jest.Mocked<EventEmitter2>;

        mockGameCombatService = {
            startCombat: jest.fn(),
        } as unknown as jest.Mocked<GameCombatService>;

        mockGridManagerService = {
            findTileByPlayer: jest.fn(),
        } as unknown as jest.Mocked<GridManagerService>;

        mockGameSessionService = {
            updateDoorTile: jest.fn(),
        } as unknown as jest.Mocked<GameSessionService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerActionsService,
                { provide: PlayerMovementService, useValue: mockPlayerMovementService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: GameCombatService, useValue: mockGameCombatService },
                { provide: GridManagerService, useValue: mockGridManagerService },
                { provide: GameSessionService, useValue: mockGameSessionService },
            ],
        }).compile();

        service = module.get<VirtualPlayerActionsService>(VirtualPlayerActionsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('moveToAttack', () => {
        let mockPlayer: Player;
        let mockVirtualTile: Tile;
        let mockLobby: Lobby;
        let mockMove: Move;

        beforeEach(() => {
            mockPlayer = createMockPlayer({ actionPoints: 3 });
            mockVirtualTile = createMockTile({ player: mockPlayer });
            mockLobby = createMockLobby();
            mockMove = createMockMove();
        });

        it('should do nothing if movement fails', async () => {
            mockMove = createMockMove();
            jest.spyOn(service as any, 'executeMove').mockResolvedValue(undefined);

            await service.moveToAttack(mockMove, mockVirtualTile, mockLobby);

            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should complete move normally if no special actions', async () => {
            const mockTargetTile = createMockTile();
            mockMove = createMockMove({ tile: mockTargetTile });
            const mockPath = [mockVirtualTile, mockTargetTile];

            jest.spyOn(service as any, 'executeMove').mockResolvedValue(mockPath);
            jest.spyOn(service as any, 'handleAdjacentToClosedDoor').mockResolvedValue(false);
            jest.spyOn(service as any, 'handleAdjacentToPlayer').mockResolvedValue(false);

            await service.moveToAttack(mockMove, mockVirtualTile, mockLobby);

            expect(mockEventEmitter.emit).toHaveBeenCalled();
        });

        it('should return early when door is opened', async () => {
            const mockMovement = [mockVirtualTile, createMockTile()];

            jest.spyOn(service as any, 'executeMove').mockResolvedValue(mockMovement);
            jest.spyOn(service as any, 'handleAdjacentToClosedDoor').mockResolvedValue(true);
            jest.spyOn(service as any, 'handleAdjacentToPlayer').mockResolvedValue(false);

            await service.moveToAttack(mockMove, mockVirtualTile, mockLobby);

            expect(service['handleAdjacentToPlayer']).not.toHaveBeenCalled();
        });
        it('should return early when attack is performed', async () => {
            const mockMovement = [mockVirtualTile, createMockTile()];

            jest.spyOn(service as any, 'executeMove').mockResolvedValue(mockMovement);
            jest.spyOn(service as any, 'handleAdjacentToClosedDoor').mockResolvedValue(false);
            jest.spyOn(service as any, 'handleAdjacentToPlayer').mockResolvedValue(true);

            await service.moveToAttack(mockMove, mockVirtualTile, mockLobby);

            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should emit VPActionDone when no door is opened and no attack is performed', async () => {
            const mockMovement = [mockVirtualTile, createMockTile()];
            const mockDestination = mockMovement[1];

            jest.spyOn(service as any, 'executeMove').mockResolvedValue(mockMovement);
            jest.spyOn(service as any, 'handleAdjacentToClosedDoor').mockResolvedValue(false);
            jest.spyOn(service as any, 'handleAdjacentToPlayer').mockResolvedValue(false);

            await service.moveToAttack(mockMove, mockVirtualTile, mockLobby);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(EventEmit.VPActionDone, mockLobby.accessCode);
        });
    });

    describe('pickUpItem', () => {
        let mockPlayer: Player;
        let mockVirtualTile: Tile;
        let mockLobby: Lobby;

        beforeEach(() => {
            mockPlayer = createMockPlayer({ actionPoints: 3 });
            mockVirtualTile = createMockTile({ player: mockPlayer });
            mockLobby = createMockLobby();
        });

        it('should do nothing if movement fails', async () => {
            const mockMove = createMockMove();
            jest.spyOn(service as any, 'executeMove').mockResolvedValue(undefined);

            await service.pickUpItem(mockMove, mockVirtualTile, mockLobby);

            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should handle adjacent closed door and return early', async () => {
            const mockTargetTile = createMockTile();
            const mockMove = createMockMove({ tile: mockTargetTile });
            const mockPath = [mockVirtualTile, mockTargetTile];

            jest.spyOn(service as any, 'executeMove').mockResolvedValue(mockPath);
            jest.spyOn(service as any, 'handleAdjacentToClosedDoor').mockResolvedValue(true);

            await service.pickUpItem(mockMove, mockVirtualTile, mockLobby);

            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should emit VPActionDone when no door is opened', async () => {
            const mockTargetTile = createMockTile();
            const mockMove = createMockMove({ tile: mockTargetTile });
            const mockPath = [mockVirtualTile, mockTargetTile];

            jest.spyOn(service as any, 'executeMove').mockResolvedValue(mockPath);
            jest.spyOn(service as any, 'handleAdjacentToClosedDoor').mockResolvedValue(false);

            await service.pickUpItem(mockMove, mockVirtualTile, mockLobby);

            expect(mockEventEmitter.emit).toHaveBeenCalled();
        });
    });

    describe('getPathForMove', () => {
        let mockVirtualTile: Tile;
        let mockLobby: Lobby;
        const mockPlayerName = 'VirtualPlayer';

        beforeEach(() => {
            mockVirtualTile = createMockTile({
                player: createMockPlayer({ name: mockPlayerName }),
            });
            mockLobby = createMockLobby();

            mockPlayerMovementService.findBestMoveTile.mockReset();
            mockPlayerMovementService.quickestPath.mockReset();
        });

        it('should use findBestMoveTile when attack move', () => {
            const targetPlayer = createMockPlayer({ name: 'TargetPlayer' });
            const mockMove = createMockMove({
                type: MoveType.Attack,
                tile: createMockTile({ player: targetPlayer }),
            });

            const mockBestTile = createMockTile();
            mockPlayerMovementService.findBestMoveTile.mockReturnValue(mockBestTile);
            mockPlayerMovementService.quickestPath.mockReturnValue([mockVirtualTile, mockBestTile]);

            const result = service.getPathForMove(mockMove, mockVirtualTile, mockLobby);

            expect(mockPlayerMovementService.findBestMoveTile).toHaveBeenCalledWith(mockMove.tile, mockVirtualTile, mockLobby.game.grid);
            expect(result).toEqual([mockVirtualTile, mockBestTile]);
        });

        it('should use findBestMoveTile when moving to other player (non-attack)', () => {
            const otherPlayer = createMockPlayer({ name: 'OtherPlayer' });
            const mockMove = createMockMove({
                type: MoveType.Item,
                tile: createMockTile({ player: otherPlayer }),
            });

            const mockBestTile = createMockTile();
            mockPlayerMovementService.findBestMoveTile.mockReturnValue(mockBestTile);
            mockPlayerMovementService.quickestPath.mockReturnValue([mockVirtualTile, mockBestTile]);

            const result = service.getPathForMove(mockMove, mockVirtualTile, mockLobby);

            expect(mockPlayerMovementService.findBestMoveTile).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should use original tile when not attacking or moving to player', () => {
            const mockMove = createMockMove({
                type: MoveType.Attack,
                tile: createMockTile({ player: undefined }),
            });

            const expectedPath = [mockVirtualTile, mockMove.tile];
            mockPlayerMovementService.quickestPath.mockReturnValue(expectedPath);

            const result = service.getPathForMove(mockMove, mockVirtualTile, mockLobby);

            expect(mockPlayerMovementService.findBestMoveTile).not.toHaveBeenCalled();
            expect(result).toEqual(expectedPath);
        });

        it('should return undefined if targetTile is undefined after best move logic', () => {
            const mockMove = createMockMove({
                type: MoveType.Attack,
                tile: createMockTile({ player: createMockPlayer({ name: 'other-player' }) }),
            });

            const mockVirtualTile = createMockTile({
                player: createMockPlayer({ name: 'virtual-player' }),
            });

            const mockLobby = createMockLobby();
            mockPlayerMovementService.findBestMoveTile.mockReturnValue(undefined);

            const result = service.getPathForMove(mockMove, mockVirtualTile, mockLobby);

            expect(result).toBeUndefined();
            expect(mockPlayerMovementService.quickestPath).not.toHaveBeenCalled();
        });
    });

    describe('calculateTotalMovementCost', () => {
        it('should calculate total movement cost', () => {
            const mockPath = [createMockTile(), createMockTile({ type: TileType.Default }), createMockTile({ type: TileType.Ice })];

            mockPlayerMovementService.getMoveCost.mockReturnValueOnce(1).mockReturnValueOnce(2);

            const result = service.calculateTotalMovementCost(mockPath);

            expect(result).toBe(3);
            expect(mockPlayerMovementService.getMoveCost).toHaveBeenCalledTimes(2);
        });

        it('should return undefined for empty path', () => {
            const result = service.calculateTotalMovementCost(null);
            expect(result).toBeUndefined();
        });
    });

    describe('checkAvailableActions', () => {
        let mockPlayer: Player;

        beforeEach(() => {
            mockPlayer = createMockPlayer();
        });
        it('should return true when player has both action and movement points', () => {
            mockPlayer = createMockPlayer({ actionPoints: 1, movementPoints: 1 });
            const mockLobby = createMockLobby();

            const result = service.checkAvailableActions(mockPlayer, mockLobby);
            expect(result).toBe(true);
        });

        it('should return true when player has movement points only', () => {
            mockPlayer = createMockPlayer({ actionPoints: 0, movementPoints: 1 });
            const mockLobby = createMockLobby();

            const result = service.checkAvailableActions(mockPlayer, mockLobby);
            expect(result).toBe(true);
        });

        it('should return true when hasIce is true and no points left', () => {
            mockPlayer = createMockPlayer({ actionPoints: 0, movementPoints: 0 });
            const mockLobby = createMockLobby();
            const mockVirtualTile = createMockTile({ player: mockPlayer });

            mockGridManagerService.findTileByPlayer.mockReturnValue(mockVirtualTile);
            mockPlayerMovementService.hasAdjacentTileType.mockImplementation((_, __, type) => (type === TileType.Ice ? true : false));

            const result = service.checkAvailableActions(mockPlayer, mockLobby);
            expect(result).toBe(true);
        });

        it('should return true when hasActionAvailable is true and only action points left', () => {
            mockPlayer = createMockPlayer({ actionPoints: 1, movementPoints: 0 });
            const mockLobby = createMockLobby();
            const mockVirtualTile = createMockTile({ player: mockPlayer });

            mockGridManagerService.findTileByPlayer.mockReturnValue(mockVirtualTile);
            mockPlayerMovementService.hasAdjacentPlayerOrDoor.mockReturnValue(true);

            const result = service.checkAvailableActions(mockPlayer, mockLobby);
            expect(result).toBe(true);
        });

        it('should return true when hasLightning and no wall adjacent with only action points left', () => {
            mockPlayer = createMockPlayer({
                actionPoints: 1,
                movementPoints: 0,
                inventory: [{ name: ItemName.Lightning } as any, null],
            });
            const mockLobby = createMockLobby();
            const mockVirtualTile = createMockTile({ player: mockPlayer });

            mockGridManagerService.findTileByPlayer.mockReturnValue(mockVirtualTile);
            mockPlayerMovementService.hasAdjacentTileType.mockImplementation((_, __, type) => (type === TileType.Wall ? false : false));
            mockPlayerMovementService.hasAdjacentPlayerOrDoor.mockReturnValue(false);

            const result = service.checkAvailableActions(mockPlayer, mockLobby);
            expect(result).toBe(true);
        });
        it('should return undefined when lobby is undefined', () => {
            const result = service.checkAvailableActions(mockPlayer, undefined);
            expect(result).toBeUndefined();

            expect(mockGridManagerService.findTileByPlayer).not.toHaveBeenCalled();
            expect(mockPlayerMovementService.hasAdjacentTileType).not.toHaveBeenCalled();
            expect(mockPlayerMovementService.hasAdjacentPlayerOrDoor).not.toHaveBeenCalled();
        });
    });

    describe('getRandomDelay', () => {
        it('should return a value within the specified range', () => {
            const min = 100;
            const max = 200;
            const result = service.getRandomDelay(min, max);

            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
        });
    });

    describe('getMoveCost', () => {
        it('should delegate to playerMovementService', () => {
            const mockTile = createMockTile();
            const expectedCost = 2;

            mockPlayerMovementService.getMoveCost.mockReturnValue(expectedCost);

            const result = service.getMoveCost(mockTile);

            expect(result).toBe(expectedCost);
            expect(mockPlayerMovementService.getMoveCost).toHaveBeenCalledWith(mockTile);
        });
    });

    describe('areOnSameTeam', () => {
        it('should return true for same team', () => {
            expect(service.areOnSameTeam(TeamType.RED, TeamType.RED)).toBe(true);
        });

        it('should return false for different teams', () => {
            expect(service.areOnSameTeam(TeamType.RED, TeamType.BLUE)).toBe(false);
        });
    });

    describe('isFlagInInventory', () => {
        let mockPlayer: Player;

        beforeEach(() => {
            mockPlayer = createMockPlayer();
        });

        it('should return false when player is undefined', () => {
            expect(service.isFlagInInventory(undefined)).toBe(false);
        });

        it('should return false when inventory is undefined', () => {
            delete mockPlayer.inventory;
            expect(service.isFlagInInventory(mockPlayer)).toBe(false);
        });

        it('should return false when inventory is null', () => {
            mockPlayer.inventory = null;
            expect(service.isFlagInInventory(mockPlayer)).toBe(false);
        });

        it('should handle all null inventory slots', () => {
            mockPlayer.inventory = [null, null];
            expect(service.isFlagInInventory(mockPlayer)).toBe(false);
        });

        it('should return true when flag is present in inventory', () => {
            mockPlayer.inventory = [{ name: ItemName.Lightning } as any, { name: ItemName.Flag } as any];

            const result = service.isFlagInInventory(mockPlayer);
            expect(result).toBe(true);
        });
    });

    describe('executeMove', () => {
        let mockMove: Move;
        let mockVirtualTile: Tile;
        let mockLobby: Lobby;
        const mockAccessCode = '1234';

        beforeEach(() => {
            mockMove = createMockMove();
            mockVirtualTile = createMockTile({
                player: createMockPlayer({ actionPoints: 3 }),
            });
            mockLobby = createMockLobby({ accessCode: mockAccessCode });

            jest.clearAllMocks();
        });

        it('should return immediately when movement is undefined', async () => {
            jest.spyOn(service as any, 'getMovement').mockReturnValue(undefined);

            const result = await (service as any).executeMove(mockMove, mockVirtualTile, mockLobby);

            expect(result).toBeUndefined();
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should adjust movement when door is present', async () => {
            const mockMovement = [mockVirtualTile, createMockTile({ type: TileType.Door })];
            const mockAdjustedMovement = [mockVirtualTile];

            jest.spyOn(service as any, 'getMovement').mockReturnValue(mockMovement);
            jest.spyOn(service as any, 'adjustMovementForDoor').mockReturnValue(mockAdjustedMovement);

            await (service as any).executeMove(mockMove, mockVirtualTile, mockLobby);

            expect(service['adjustMovementForDoor']).toHaveBeenCalledWith(mockMovement);
        });

        it('should end turn when staying in place for item move', async () => {
            const mockMovement = [mockVirtualTile];
            const itemMove = createMockMove({ type: MoveType.Item });

            jest.spyOn(service as any, 'getMovement').mockReturnValue(mockMovement);

            await (service as any).executeMove(itemMove, mockVirtualTile, mockLobby);

            expect(mockEventEmitter.emit).toHaveBeenCalled();
        });

        it('should end turn when door blocks with no action points', async () => {
            const noActionPlayer = createMockPlayer({ actionPoints: 0 });
            const mockTile = createMockTile({ player: noActionPlayer });
            const mockMovement = [mockTile, createMockTile({ type: TileType.Door })];

            jest.spyOn(service as any, 'getMovement').mockReturnValue(mockMovement);
            jest.spyOn(service as any, 'adjustMovementForDoor').mockReturnValue([mockTile]);

            await (service as any).executeMove(mockMove, mockTile, mockLobby);

            expect(mockEventEmitter.emit).toHaveBeenCalled();
        });

        it('should execute normal move when no special conditions', async () => {
            const mockMovement = [mockVirtualTile, createMockTile()];
            const mockAdjustedMovement = [...mockMovement];

            jest.spyOn(service as any, 'getMovement').mockReturnValue(mockMovement);
            jest.spyOn(service as any, 'adjustMovementForDoor').mockReturnValue(mockAdjustedMovement);
            jest.spyOn(service as any, 'move').mockImplementation(() => {});

            const result = await (service as any).executeMove(mockMove, mockVirtualTile, mockLobby);

            expect(service['move']).toHaveBeenCalled();
            expect(result).toEqual(mockMovement);
        });
    });

    describe('handleAdjacentToClosedDoor', () => {
        let mockVirtualTile: Tile;
        let mockDestinationTile: Tile;
        let mockMovement: Tile[];
        const mockAccessCode = '1234';

        beforeEach(() => {
            mockVirtualTile = createMockTile({
                player: createMockPlayer({ actionPoints: 3 }),
            });
            mockDestinationTile = createMockTile();
            mockMovement = [mockVirtualTile, mockDestinationTile];
        });

        it('should return false when destination is not a door', async () => {
            mockDestinationTile.type = TileType.Default;
            mockDestinationTile.isOpen = false;

            const result = await (service as any).handleAdjacentToClosedDoor(mockDestinationTile, mockVirtualTile, mockMovement, mockAccessCode);

            expect(result).toBe(false);
            expect(mockGameSessionService.updateDoorTile).not.toHaveBeenCalled();
        });

        it('should return false when player has no action points', async () => {
            mockDestinationTile.type = TileType.Door;
            mockDestinationTile.isOpen = false;
            mockVirtualTile.player.actionPoints = 0;

            const result = await (service as any).handleAdjacentToClosedDoor(mockDestinationTile, mockVirtualTile, mockMovement, mockAccessCode);

            expect(result).toBe(false);
            expect(mockGameSessionService.updateDoorTile).not.toHaveBeenCalled();
        });

        it('should open door and return true when conditions are met', async () => {
            mockDestinationTile.type = TileType.Door;
            mockDestinationTile.isOpen = false;
            mockVirtualTile.player.actionPoints = 3;

            const result = await (service as any).handleAdjacentToClosedDoor(mockDestinationTile, mockVirtualTile, mockMovement, mockAccessCode);

            expect(result).toBe(true);
            expect(mockGameSessionService.updateDoorTile).toHaveBeenCalledWith(mockAccessCode, mockVirtualTile, mockDestinationTile);
            expect(mockVirtualTile.player.actionPoints).toBe(2);
        });
    });

    describe('handleAdjacentToPlayer', () => {
        let mockVirtualTile: Tile;
        let mockMove: Move;
        let mockLobby: Lobby;
        const mockAccessCode = '1234';

        beforeEach(() => {
            mockVirtualTile = createMockTile({ player: createMockPlayer({ actionPoints: 3 }) });
            mockMove = createMockMove({ tile: createMockTile({ player: createMockPlayer() }) });
            mockLobby = createMockLobby({ accessCode: mockAccessCode });

            mockPlayerMovementService.getNeighbors.mockReturnValue([mockVirtualTile]);
        });

        it('should return false when not adjacent or no action points', async () => {
            mockPlayerMovementService.getNeighbors.mockReturnValue([]);
            expect(await (service as any).handleAdjacentToPlayer(mockVirtualTile, mockVirtualTile, mockMove, mockLobby)).toBe(false);

            mockVirtualTile.player.actionPoints = 0;
            expect(await (service as any).handleAdjacentToPlayer(mockVirtualTile, mockVirtualTile, mockMove, mockLobby)).toBe(false);
        });

        it('should execute attack when conditions are met', async () => {
            const result = await (service as any).handleAdjacentToPlayer(mockVirtualTile, mockVirtualTile, mockMove, mockLobby);

            expect(result).toBe(true);
            expect(mockGameCombatService.startCombat).toHaveBeenCalled();
            expect(mockVirtualTile.player.actionPoints).toBe(2);
        });
    });

    describe('adjustMovementForDoor', () => {
        it('should return original movement when last tile is not a closed door', () => {
            const mockMovement = [createMockTile(), createMockTile()];

            const result = (service as any).adjustMovementForDoor(mockMovement);
            expect(result).toEqual(mockMovement);
        });

        it('should trim movement when last tile is a closed door', () => {
            const mockMovement = [createMockTile(), createMockTile({ type: TileType.Door, isOpen: false })];

            const expected = [mockMovement[0]];

            const result = (service as any).adjustMovementForDoor(mockMovement);
            expect(result).toEqual(expected);
        });
    });

    describe('getMovement', () => {
        let mockVirtualTile: Tile;
        let mockMove: Move;
        let mockGrid: Tile[][];
        const mockPlayerName = 'VirtualPlayer';

        beforeEach(() => {
            mockVirtualTile = createMockTile({
                player: createMockPlayer({ name: mockPlayerName, movementPoints: 5 }),
            });
            mockGrid = [[createMockTile()]];
            mockMove = createMockMove();

            mockPlayerMovementService.findClosestReachableTile.mockReset();
            mockPlayerMovementService.getFarthestReachableTile.mockReset();
            mockPlayerMovementService.quickestPath.mockReset();
            mockPlayerMovementService.trimPathAtObstacle.mockReset();
        });

        it('should use findClosestReachableTile for attack moves', () => {
            const targetPlayer = createMockPlayer({ name: 'TargetPlayer' });
            mockMove = createMockMove({
                type: MoveType.Attack,
                tile: createMockTile({ player: targetPlayer }),
            });

            const mockReachableTile = createMockTile();
            mockPlayerMovementService.findClosestReachableTile.mockReturnValue(mockReachableTile);
            mockPlayerMovementService.quickestPath.mockReturnValue([mockVirtualTile, mockReachableTile]);

            (service as any).getMovement(mockMove, mockVirtualTile, mockGrid);

            expect(mockPlayerMovementService.findClosestReachableTile).toHaveBeenCalledWith(
                mockMove.tile,
                mockVirtualTile,
                mockGrid,
                mockVirtualTile.player.movementPoints,
            );
        });

        it('should return undefined if no reachable tile', () => {
            mockPlayerMovementService.findClosestReachableTile.mockReturnValue(undefined);

            const result = (service as any).getMovement(mockMove, mockVirtualTile, mockGrid);

            expect(result).toBeUndefined();
        });

        it('should trim path at obstacles', () => {
            const mockReachableTile = createMockTile();
            const mockPath = [mockVirtualTile, mockReachableTile];
            const mockTrimmedPath = [mockVirtualTile];

            mockPlayerMovementService.getFarthestReachableTile.mockReturnValue(mockReachableTile);
            mockPlayerMovementService.quickestPath.mockReturnValue(mockPath);
            mockPlayerMovementService.trimPathAtObstacle.mockReturnValue(mockTrimmedPath);

            const result = (service as any).getMovement(mockMove, mockVirtualTile, mockGrid);

            expect(mockPlayerMovementService.trimPathAtObstacle).toHaveBeenCalledWith(mockPath);
            expect(result).toEqual(mockTrimmedPath);
        });
    });

    describe('executeAttack (private method)', () => {
        const mockAccessCode = '1234';
        let mockCurrentTile: Tile;
        let mockActionTile: Tile;

        beforeEach(() => {
            mockCurrentTile = createMockTile({ player: createMockPlayer() });
            mockActionTile = createMockTile({ player: createMockPlayer() });
            jest.spyOn(service, 'getRandomDelay').mockReturnValue(100);
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should end turn when actionTile has no player', async () => {
            mockActionTile.player = undefined;

            const promise = (service as any).executeAttack(mockAccessCode, mockCurrentTile, mockActionTile);
            jest.advanceTimersByTime(100);
            await promise;

            expect(mockEventEmitter.emit).toHaveBeenCalled();
            expect(mockGameCombatService.startCombat).not.toHaveBeenCalled();
        });
    });

    describe('openDoor', () => {
        const mockAccessCode = '1234';
        let mockCurrentTile: Tile;

        beforeEach(() => {
            mockCurrentTile = createMockTile({ player: createMockPlayer() });
            jest.spyOn(service, 'getRandomDelay').mockReturnValue(100);
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should end turn when actionTile is undefined', async () => {
            await (service as any).openDoor(mockAccessCode, mockCurrentTile, undefined);

            expect(mockEventEmitter.emit).toHaveBeenCalled();
            expect(mockGameSessionService.updateDoorTile).not.toHaveBeenCalled();
        });
        it('should open door when actionTile exists', async () => {
            const mockActionTile = createMockTile();

            const promise = (service as any).openDoor(mockAccessCode, mockCurrentTile, mockActionTile);
            jest.advanceTimersByTime(100);
            await promise;

            expect(mockGameSessionService.updateDoorTile).toHaveBeenCalled();
        });
    });
});
