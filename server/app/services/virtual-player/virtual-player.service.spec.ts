/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MoveType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtual-player.gateway.events';
import { DiceType } from '@app/interfaces/dice';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { Item } from '@app/model/database/item';
import { Player } from '@app/model/database/player';
import { Tile, TileType } from '@app/model/database/tile';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { VirtualPlayerActionsService } from '@app/services/virtual-player-actions/virtual-player-actions.service';
import { VirtualPlayerBehaviorService } from '@app/services/virtual-player-behavior/virtual-player-behavior.service';
import { Behavior, ItemName } from '@common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from 'eventemitter2';
import { VirtualPlayerService } from './virtual-player.service';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;
    let mockEventEmitter: EventEmitter2;
    let mockBehaviorService: VirtualPlayerBehaviorService;
    let mockLobbyService: LobbyService;
    let mockActionsService: VirtualPlayerActionsService;

    const createMockVirtualPlayer = (overrides?: Partial<VirtualPlayer>): VirtualPlayer => ({
        name: 'TestPlayer',
        avatar: 'avatar.png',
        speed: 1,
        attack: { value: 1, bonusDice: DiceType.D4 },
        defense: { value: 1, bonusDice: DiceType.D6 },
        hp: { current: 10, max: 10 },
        movementPoints: 5,
        actionPoints: 3,
        inventory: [null, null],
        isAdmin: false,
        isVirtual: true,
        hasAbandoned: false,
        isActive: true,
        combatWon: 0,
        behavior: Behavior.Aggressive,
        ...overrides,
    });

    const createMockItem = (name: string): Item => ({
        id: '1',
        name: name as any,
        imageSrc: 'img.png',
        imageSrcGrey: 'img-grey.png',
        itemCounter: 0,
        description: 'description',
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerService,
                {
                    provide: EventEmitter2,
                    useValue: { emit: jest.fn() },
                },
                {
                    provide: VirtualPlayerBehaviorService,
                    useValue: {
                        tryToEscapeIfWounded: jest.fn().mockResolvedValue(false),
                        executeBehavior: jest.fn(),
                        attack: jest.fn(),
                    },
                },
                {
                    provide: LobbyService,
                    useValue: {
                        getLobby: jest.fn().mockReturnValue({ game: { grid: [] } }),
                    },
                },
                {
                    provide: VirtualPlayerActionsService,
                    useValue: {
                        getRandomDelay: jest.fn().mockReturnValue(0),
                        checkAvailableActions: jest.fn() as jest.Mock<boolean, [Player, Lobby]>,
                    },
                },
            ],
        }).compile();

        service = module.get<VirtualPlayerService>(VirtualPlayerService);
        mockEventEmitter = module.get(EventEmitter2);
        mockBehaviorService = module.get(VirtualPlayerBehaviorService);
        mockLobbyService = module.get(LobbyService);
        mockActionsService = module.get(VirtualPlayerActionsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('resetStats', () => {
        it('should reset player stats', () => {
            const mockPlayer = createMockVirtualPlayer();
            service['virtualPlayer'] = mockPlayer;
            service['movementPoints'] = 10;
            service['actionsPoints'] = 6;

            service.resetStats();

            expect(mockPlayer.movementPoints).toBe(10);
            expect(mockPlayer.actionPoints).toBe(6);
        });
    });

    describe('itemChoice', () => {
        const mockItems = [
            createMockItem(ItemName.Flag),
            createMockItem(ItemName.Potion),
            createMockItem(ItemName.Lightning),
            createMockItem(ItemName.Rubik),
        ];

        it('should return undefined for Null behavior', () => {
            const result = service.itemChoice(Behavior.Null, mockItems);
            expect(result).toBeUndefined();
        });

        it('should return non-preferred item for Aggressive behavior', () => {
            const result = service.itemChoice(Behavior.Aggressive, mockItems);
            expect(result?.name).toBe(ItemName.Lightning);
        });

        it('should return non-preferred item for Defensive behavior', () => {
            const result = service.itemChoice(Behavior.Defensive, mockItems);
            expect(result?.name).toBe(ItemName.Potion);
        });

        it('should return null when all items are preferred', () => {
            const preferredItems = [createMockItem(ItemName.Flag), createMockItem(ItemName.Potion)];
            const result = service.itemChoice(Behavior.Aggressive, preferredItems);
            expect(result).toBeNull();
        });

        it('should handle empty items array', () => {
            const result = service.itemChoice(Behavior.Aggressive, []);
            expect(result).toBeNull();
        });
    });

    describe('itemChoice', () => {
        const mockItems = [createMockItem('HealthPotion'), createMockItem('Flag'), createMockItem('Lightning')];

        it('should return null for Null behavior', () => {
            const result = service.itemChoice(Behavior.Null, mockItems);
            expect(result).toBeUndefined();
        });
    });

    describe('handleTurnStart', () => {
        it('should initialize and delay for virtual player', () => {
            const mockPlayer = createMockVirtualPlayer();
            jest.spyOn(service, 'delay');

            service.handleTurnStart('1234', mockPlayer);

            expect(service['virtualPlayer']).toBe(mockPlayer);
            expect(service.delay).toHaveBeenCalledWith('1234');
        });

        it('should do nothing for real player', () => {
            const mockPlayer = createMockVirtualPlayer({ isVirtual: false });
            jest.spyOn(service, 'delay');

            service.handleTurnStart('1234', mockPlayer);

            expect(service.delay).not.toHaveBeenCalled();
        });
    });

    describe('handleCombatTurnStart', () => {
        it('should try to escape if defensive', async () => {
            const mockPlayer = createMockVirtualPlayer({ behavior: Behavior.Defensive });

            await service.handleCombatTurnStart('1234', mockPlayer);

            expect(mockBehaviorService.tryToEscapeIfWounded).toHaveBeenCalled();
        });

        it('should return early if virtual defensive player has escaped', async () => {
            const mockPlayer = createMockVirtualPlayer({ behavior: Behavior.Defensive });

            (mockBehaviorService.tryToEscapeIfWounded as jest.Mock).mockResolvedValueOnce(true);

            const result = await service.handleCombatTurnStart('1234', mockPlayer);

            expect(mockBehaviorService.tryToEscapeIfWounded).toHaveBeenCalledWith(mockPlayer, '1234');
            expect(result).toBeUndefined();
        });
        it('should attack if virtual player is aggressive', async () => {
            const mockPlayer = createMockVirtualPlayer({ behavior: Behavior.Aggressive });

            const attackSpy = jest.spyOn(mockBehaviorService, 'attack');

            await service.handleCombatTurnStart('1234', mockPlayer);

            expect(service['virtualPlayer']).toBe(mockPlayer);
            expect(attackSpy).toHaveBeenCalledWith(mockPlayer, '1234');
        });
    });

    describe('hasAvailableActions', () => {
        it('should end turn when no actions available', () => {
            const mockPlayer = createMockVirtualPlayer();
            const mockLobby = { game: { grid: [] } } as Lobby;
            (mockActionsService.checkAvailableActions as jest.Mock).mockReturnValueOnce(false);
            const result = service['hasAvailableActions']('1234', mockPlayer, mockLobby);
            expect(result).toBe(false);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode: '1234' });
            expect(mockActionsService.checkAvailableActions).toHaveBeenCalledWith(mockPlayer, mockLobby);
        });
    });

    describe('findAllMoves', () => {
        it('should return combined moves', () => {
            const mockGrid = [[{ player: { name: 'other' }, item: null }], [{ player: null, item: { name: 'Flag' } }]] as Tile[][];
            service['virtualPlayer'] = createMockVirtualPlayer({ name: 'TestPlayer' });

            const result = service['findAllMoves'](mockGrid);

            expect(result.length).toBe(2);
            expect(result[0].type).toBe(MoveType.Attack);
            expect(result[1].type).toBe(MoveType.Item);
        });
    });

    describe('executeVirtualPlayerTurn', () => {
        let mockPlayer: VirtualPlayer;
        let mockLobby: Lobby;
        let mockGame: Game;

        beforeEach(() => {
            mockPlayer = createMockVirtualPlayer();
            mockGame = {
                id: 'game1',
                name: 'Test Game',
                size: '15x15',
                mode: 'Classic',
                lastModified: new Date(),
                isVisible: true,
                previewImage: '',
                description: 'Test game',
                grid: [],
            };
            mockLobby = {
                isLocked: false,
                accessCode: '1234',
                game: mockGame,
                players: [mockPlayer],
                maxPlayers: 4,
                waitingPlayers: [],
            };

            service['virtualPlayer'] = mockPlayer;
            (mockLobbyService.getLobby as jest.Mock).mockReturnValue(mockLobby);
            (mockActionsService.checkAvailableActions as jest.Mock).mockReturnValue(true);
        });

        it('should do nothing when lobby is not found', () => {
            (mockLobbyService.getLobby as jest.Mock).mockReturnValueOnce(undefined);

            service['executeVirtualPlayerTurn']('1234');

            expect(mockBehaviorService.executeBehavior).not.toHaveBeenCalled();
            expect(mockLobbyService.getLobby).toHaveBeenCalledWith('1234');
        });

        it('should do nothing when no actions available', () => {
            (mockActionsService.checkAvailableActions as jest.Mock).mockReturnValueOnce(false);

            service['executeVirtualPlayerTurn']('1234');

            expect(mockBehaviorService.executeBehavior).not.toHaveBeenCalled();
            expect(mockActionsService.checkAvailableActions).toHaveBeenCalledWith(mockPlayer, mockLobby);
        });

        it('should execute behavior with correct moves when actions are available', () => {
            const mockTileWithPlayer: Tile = {
                id: 'tile1',
                player: { name: 'enemy' } as Player,
                item: null,
                imageSrc: '',
                isOccupied: true,
                type: TileType.Default,
                isOpen: true,
            };

            mockGame.grid = [[mockTileWithPlayer]];

            service['executeVirtualPlayerTurn']('1234');

            expect(mockBehaviorService.executeBehavior).toHaveBeenCalledWith(
                mockPlayer,
                mockLobby,
                expect.arrayContaining([
                    expect.objectContaining({
                        type: MoveType.Attack,
                        tile: mockTileWithPlayer,
                    }),
                ]),
            );
        });
    });

    describe('findPlayers', () => {
        it('should find opponent players', () => {
            const mockGrid = [[{ player: { name: 'other' }, item: null }], [{ player: { name: 'TestPlayer' }, item: null }]] as Tile[][];
            service['virtualPlayer'] = createMockVirtualPlayer({ name: 'TestPlayer' });

            const result = service['findPlayers'](mockGrid);

            expect(result.length).toBe(1);
            expect(result[0].tile.player?.name).toBe('other');
        });
    });

    describe('findItems', () => {
        it('should find items on grid', () => {
            const mockGrid = [[{ item: { name: 'Flag' }, player: null }], [{ item: null, player: null }]] as Tile[][];

            const result = service['findItems'](mockGrid);

            expect(result.length).toBe(1);
            expect(result[0].tile.item?.name).toBe('Flag');
        });
    });
});
