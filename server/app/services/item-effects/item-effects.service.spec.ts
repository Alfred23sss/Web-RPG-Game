/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AttributeType, DiceType, EventEmit, ItemName } from '@app/enums/enums';
import { Item } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { TileType } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemEffectsService } from './item-effects.service';

const BONUS_VALUE = 2;
const PENALTY_VALUE = -1;
const INVALID_ATTRIBUTE_VALUE = 999;
const TEST_CODE = 'test-code';
const DEFAULT_STAT_VALUE = 4;

const MOCK_PLAYER: Player = {
    name: 'test-player',
    avatar: 'test-avatar',
    speed: DEFAULT_STAT_VALUE,
    attack: {
        value: DEFAULT_STAT_VALUE,
        bonusDice: DiceType.D6,
    },
    defense: {
        value: DEFAULT_STAT_VALUE,
        bonusDice: DiceType.D4,
    },
    hp: {
        current: DEFAULT_STAT_VALUE,
        max: DEFAULT_STAT_VALUE,
    },
    movementPoints: 0,
    actionPoints: 0,
    inventory: [null, null],
    isAdmin: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
    isVirtual: false,
};

const MOCK_ITEM: Item = {
    id: 'test-item',
    name: ItemName.Potion,
    modifiers: [
        { attribute: AttributeType.Attack, value: BONUS_VALUE },
        { attribute: AttributeType.Defense, value: PENALTY_VALUE },
    ],
    isActive: false,
    imageSrc: '',
    imageSrcGrey: '',
    itemCounter: 0,
    description: '',
};

const MOCK_TILE: Tile = {
    id: '',
    imageSrc: '',
    isOccupied: false,
    isOpen: false,
    type: TileType.Default,
};

describe('ItemEffectsService', () => {
    let service: ItemEffectsService;
    let eventEmitter: EventEmitter2;
    let gridManager: GridManagerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ItemEffectsService,
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
                {
                    provide: GridManagerService,
                    useValue: {
                        findTileByPlayer: jest.fn().mockReturnValue(MOCK_TILE),
                        findClosestAvailableTile: jest.fn().mockReturnValue(MOCK_TILE),
                    },
                },
            ],
        }).compile();

        service = module.get<ItemEffectsService>(ItemEffectsService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
        gridManager = module.get<GridManagerService>(GridManagerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('addEffect', () => {
        it('should handle unknown attribute types', () => {
            const mockItem = {
                ...MOCK_ITEM,
                name: ItemName.Rubik,
                modifiers: [{ attribute: INVALID_ATTRIBUTE_VALUE as unknown as AttributeType, value: INVALID_ATTRIBUTE_VALUE }],
            };

            service.addEffect(MOCK_PLAYER, mockItem, MOCK_TILE);

            expect(MOCK_PLAYER.speed).toBe(DEFAULT_STAT_VALUE);
            expect(MOCK_PLAYER.attack.value).toBe(DEFAULT_STAT_VALUE);
            expect(MOCK_PLAYER.defense.value).toBe(DEFAULT_STAT_VALUE);
            expect(MOCK_PLAYER.hp.max).toBe(DEFAULT_STAT_VALUE);
            expect(mockItem.isActive).toBe(true);
        });

        it('should exit early when item is null', () => {
            service.addEffect(MOCK_PLAYER, null, MOCK_TILE);

            expect(MOCK_PLAYER.attack.value).toBe(DEFAULT_STAT_VALUE);
            expect(MOCK_PLAYER.defense.value).toBe(DEFAULT_STAT_VALUE);
            expect(MOCK_PLAYER.speed).toBe(DEFAULT_STAT_VALUE);
            expect(MOCK_PLAYER.hp.max).toBe(DEFAULT_STAT_VALUE);
        });

        it('should apply attack and defense modifiers and activate item', () => {
            service.addEffect(MOCK_PLAYER, MOCK_ITEM, MOCK_TILE);

            expect(MOCK_PLAYER.attack.value).toBe(DEFAULT_STAT_VALUE + BONUS_VALUE);
            expect(MOCK_PLAYER.defense.value).toBe(DEFAULT_STAT_VALUE + PENALTY_VALUE);
            expect(MOCK_ITEM.isActive).toBe(true);
        });

        it('should apply speed and hp modifiers and activate item', () => {
            const mockItem = {
                ...MOCK_ITEM,
                name: ItemName.Rubik,
                modifiers: [
                    { attribute: AttributeType.Speed, value: BONUS_VALUE },
                    { attribute: AttributeType.Hp, value: PENALTY_VALUE },
                ],
                isActive: false,
            };

            service.addEffect(MOCK_PLAYER, mockItem, MOCK_TILE);

            expect(MOCK_PLAYER.speed).toBe(DEFAULT_STAT_VALUE + BONUS_VALUE);
            expect(MOCK_PLAYER.hp.max).toBe(DEFAULT_STAT_VALUE + PENALTY_VALUE);
            expect(mockItem.isActive).toBe(true);
        });

        it('should not activate item if conditions fail', () => {
            const mockPlayer = { ...MOCK_PLAYER, hp: { current: 4, max: 6 } };
            const fireItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.Fire,
                modifiers: null,
                isActive: false,
            };

            service.addEffect(mockPlayer, fireItem, MOCK_TILE);
            expect(fireItem.isActive).toBe(false);
        });

        it('should exit for Fire item when health above threshold', () => {
            const fireItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.Fire,
                modifiers: null,
            };
            const highHealthPlayer = {
                ...MOCK_PLAYER,
                hp: { current: 4, max: 6 },
            };

            service.addEffect(highHealthPlayer, fireItem, MOCK_TILE);

            expect(fireItem.isActive).toBe(false);
            expect(highHealthPlayer.attack.value).toBe(6);
        });

        it('should exit for Swap item on non-ice tile', () => {
            const mockPlayer = MOCK_PLAYER;
            const swapItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.Swap,
                modifiers: null,
            };

            const mockWaterTile: Tile = { ...MOCK_TILE, type: TileType.Water };
            service.addEffect(mockPlayer, swapItem, mockWaterTile);

            expect(swapItem.isActive).toBe(false);
            expect(mockPlayer.defense.value).toBe(MOCK_PLAYER.defense.value);
        });
    });

    describe('removeEffects', () => {
        it('should remove modifiers and deactivate item', () => {
            const testItem: Item = {
                ...MOCK_ITEM,
                isActive: true,
            };
            const mockPlayer = { ...MOCK_PLAYER, attack: { value: 6, bonusDice: DiceType.D6 }, defense: { value: 3, bonusDice: DiceType.D4 } };
            MOCK_PLAYER.inventory[0] = testItem;

            service.removeEffects(mockPlayer, 0);

            expect(mockPlayer.attack.value).toBe(DEFAULT_STAT_VALUE);
            expect(mockPlayer.defense.value).toBe(DEFAULT_STAT_VALUE);
            expect(testItem.isActive).toBe(false);
        });
    });

    describe('handleItemDropped', () => {
        it('should swap items between player and tile', () => {
            const tileItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.Fire,
            };
            MOCK_TILE.item = tileItem;
            MOCK_PLAYER.inventory[0] = MOCK_ITEM;

            service.handleItemDropped(MOCK_PLAYER, MOCK_ITEM, [[MOCK_TILE]], TEST_CODE);

            expect(MOCK_PLAYER.inventory).toContain(tileItem);
            expect(MOCK_TILE.item).toBe(MOCK_ITEM);
            expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.GameGridUpdate, expect.anything());
            expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.PlayerUpdate, expect.anything());
        });
    });

    describe('handlePlayerItemReset', () => {
        it('should reset player inventory and distribute items', () => {
            MOCK_PLAYER.inventory = [MOCK_ITEM, MOCK_ITEM];
            const result = service.handlePlayerItemReset(MOCK_PLAYER, [[MOCK_TILE]], TEST_CODE);

            expect(result.player.inventory).toEqual([null, null]);
            expect(MOCK_TILE.item).toBeDefined();
            expect(eventEmitter.emit).toHaveBeenCalled();
        });

        it('should place first item from shuffled inventory on player tile when empty', () => {
            const player = { ...MOCK_PLAYER, inventory: [MOCK_ITEM, MOCK_ITEM] as [Item, Item] };
            const grid = [[MOCK_TILE]];
            MOCK_TILE.item = null;

            service.handlePlayerItemReset(player, grid, TEST_CODE);

            expect(MOCK_TILE.item).toBe(MOCK_ITEM);
            expect(gridManager.findClosestAvailableTile).toHaveBeenCalled();
        });
    });

    describe('addItemToPlayer', () => {
        it('should add item to empty inventory slot', () => {
            MOCK_TILE.item = MOCK_ITEM;
            MOCK_PLAYER.inventory = [null, null];

            service.addItemToPlayer(MOCK_PLAYER, MOCK_ITEM, [[MOCK_TILE]], TEST_CODE);

            expect(MOCK_PLAYER.inventory).toContain(MOCK_ITEM);
            expect(MOCK_TILE.item).toBeNull();
            expect(eventEmitter.emit).toHaveBeenCalled();
        });

        it('should trigger item choice when inventory is full', () => {
            MOCK_PLAYER.inventory = [MOCK_ITEM, MOCK_ITEM];
            MOCK_TILE.item = MOCK_ITEM;

            const result = service.addItemToPlayer(MOCK_PLAYER, MOCK_ITEM, [[MOCK_TILE]], TEST_CODE);

            expect(result.items).toHaveLength(3);
            expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.ItemChoice, expect.anything());
        });

        it('should not place items on occupied player tile', () => {
            const occupiedTile = { ...MOCK_TILE, item: MOCK_ITEM };
            (gridManager.findTileByPlayer as jest.Mock).mockReturnValue(occupiedTile);

            const player = { ...MOCK_PLAYER, inventory: [MOCK_ITEM, MOCK_ITEM] as [Item, Item] };
            service.handlePlayerItemReset(player, [[occupiedTile]], TEST_CODE);

            expect(occupiedTile.item).toBe(MOCK_ITEM);
        });
    });

    describe('applyItemModifiers', () => {
        it('should set correct modifiers for Potion', () => {
            const potion: Item = { id: 'potion', name: ItemName.Potion } as Item;
            service.applyItemModifiers(potion);
            expect(potion.modifiers).toHaveLength(2);
        });

        it('should set correct modifiers for Swap', () => {
            const swap: Item = { id: 'swap', name: ItemName.Swap } as Item;
            service.applyItemModifiers(swap);
            expect(swap.modifiers[0].attribute).toBe(AttributeType.Defense);
        });

        it('should return early when item is not valid', () => {
            const item: Item = { id: 'flag', name: ItemName.Flag } as Item;

            service.applyItemModifiers(item);

            expect(item.modifiers).toBeUndefined();
            expect(item.isActive).toBeUndefined();
        });

        it('should handle unknown attribute types in default case', () => {
            const playerCopy = JSON.parse(JSON.stringify(MOCK_PLAYER));
            const invalidModifier = {
                attribute: INVALID_ATTRIBUTE_VALUE as unknown as AttributeType,
                value: 0,
            };

            service['applyModifier'](playerCopy, invalidModifier, 1);

            expect(playerCopy.attack.value).toBe(MOCK_PLAYER.attack.value);
            expect(playerCopy.defense.value).toBe(MOCK_PLAYER.defense.value);
            expect(playerCopy.speed).toBe(MOCK_PLAYER.speed);
            expect(playerCopy.hp.current).toBe(MOCK_PLAYER.hp.current);
            expect(playerCopy.hp.max).toBe(MOCK_PLAYER.hp.max);
        });

        const BASE_ITEM: Partial<Item> = {
            modifiers: undefined,
            isActive: true,
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 0,
            description: '',
        };

        it('should configure Rubik cube modifiers correctly', () => {
            const rubikItem: Item = {
                ...BASE_ITEM,
                id: 'rubik',
                name: ItemName.Rubik,
            } as Item;

            service.applyItemModifiers(rubikItem);

            expect(rubikItem.modifiers).toEqual([
                { attribute: AttributeType.Speed, value: BONUS_VALUE },
                { attribute: AttributeType.Hp, value: PENALTY_VALUE },
            ]);
            expect(rubikItem.isActive).toBe(false);
        });

        it('should configure Fire modifiers correctly', () => {
            const fireItem: Item = {
                ...BASE_ITEM,
                id: 'fire',
                name: ItemName.Fire,
            } as Item;

            service.applyItemModifiers(fireItem);

            expect(fireItem.modifiers).toEqual([{ attribute: AttributeType.Attack, value: BONUS_VALUE }]);
            expect(fireItem.isActive).toBe(false);
        });

        it('should configure Swap modifiers correctly', () => {
            const swapItem: Item = {
                ...BASE_ITEM,
                id: 'swap',
                name: ItemName.Swap,
            } as Item;

            service.applyItemModifiers(swapItem);

            expect(swapItem.modifiers).toEqual([{ attribute: AttributeType.Defense, value: BONUS_VALUE }]);
            expect(swapItem.isActive).toBe(false);
        });
    });

    describe('condition checks', () => {
        it('should validate health condition correctly', () => {
            const fireItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.Fire,
            };

            const validPlayer = { ...MOCK_PLAYER, hp: { current: 3, max: 6 } };
            const valid = service.isHealthConditionValid(validPlayer, fireItem);
            expect(valid).toBe(true);

            const invalidPlayer = { ...MOCK_PLAYER, hp: { current: 4, max: 6 } };
            const invalid = service.isHealthConditionValid(invalidPlayer, fireItem);
            expect(invalid).toBe(false);
        });

        it('should validate ice condition correctly', () => {
            const swapItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.Swap,
            };

            const iceTile: Tile = { ...MOCK_TILE, type: TileType.Ice };
            const valid = service.isIceConditionValid(iceTile, swapItem);
            expect(valid).toBe(true);

            const invalid = service.isIceConditionValid(MOCK_TILE, swapItem);
            expect(invalid).toBe(false);
        });

        it('should return false when tile is undefined', () => {
            const swapItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.Swap,
            };
            const result = service['isIceConditionValid'](undefined, swapItem);
            expect(result).toBe(false);
        });
    });
});
