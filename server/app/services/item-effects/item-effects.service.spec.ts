/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AttributeType, EventEmit } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtual-player.gateway.events';
import { Item } from '@app/interfaces/item';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { TileType } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { DiceType, ItemName } from '@common/enums';
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
    name: ItemName.BlackSword,
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
                name: ItemName.Armor,
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
                name: ItemName.Armor,
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
            const iceSwordItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.IceSword,
                modifiers: null,
                isActive: false,
            };

            service.addEffect(mockPlayer, iceSwordItem, MOCK_TILE);
            expect(iceSwordItem.isActive).toBe(false);
        });

        it('should exit for IceSword item when health above threshold', () => {
            const iceSwordItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.IceSword,
                modifiers: null,
            };
            const highHealthPlayer = {
                ...MOCK_PLAYER,
                hp: { current: 4, max: 6 },
            };

            service.addEffect(highHealthPlayer, iceSwordItem, MOCK_TILE);

            expect(iceSwordItem.isActive).toBe(false);
            expect(highHealthPlayer.attack.value).toBe(6);
        });

        it('should exit for IceShield item on non-ice tile', () => {
            const mockPlayer = MOCK_PLAYER;
            const iceShieldItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.IceShield,
                modifiers: null,
            };

            const mockWaterTile: Tile = { ...MOCK_TILE, type: TileType.Water };
            service.addEffect(mockPlayer, iceShieldItem, mockWaterTile);

            expect(iceShieldItem.isActive).toBe(false);
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
        it('should IceShield items between player and tile', () => {
            const tileItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.IceSword,
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

        it('should emit VirtualPlayerEvents.ChooseItem when player is virtual and inventory is full', () => {
            const virtualPlayer: Player = { ...MOCK_PLAYER, isVirtual: true, inventory: [MOCK_ITEM, MOCK_ITEM] };
            MOCK_TILE.item = MOCK_ITEM;

            service.addItemToPlayer(virtualPlayer, MOCK_ITEM, [[MOCK_TILE]], TEST_CODE);

            expect(eventEmitter.emit).toHaveBeenCalledWith(VirtualPlayerEvents.ChooseItem, {
                accessCode: TEST_CODE,
                player: virtualPlayer,
                items: [MOCK_ITEM, MOCK_ITEM, MOCK_ITEM],
                item: MOCK_ITEM,
            });
        });
    });

    describe('applyItemModifiers', () => {
        it('should set correct modifiers for BlackSword', () => {
            const blackSword: Item = { id: 'BlackSword', name: ItemName.BlackSword } as Item;
            service.applyItemModifiers(blackSword);
            expect(blackSword.modifiers).toHaveLength(2);
        });

        it('should set correct modifiers for IceShield', () => {
            const iceShield: Item = { id: 'IceShield', name: ItemName.IceShield } as Item;
            service.applyItemModifiers(iceShield);
            expect(iceShield.modifiers[0].attribute).toBe(AttributeType.Defense);
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

        it('should configure Armor cube modifiers correctly', () => {
            const armorItem: Item = {
                ...BASE_ITEM,
                id: 'Armor',
                name: ItemName.Armor,
            } as Item;

            service.applyItemModifiers(armorItem);

            expect(armorItem.modifiers).toEqual([
                { attribute: AttributeType.Hp, value: BONUS_VALUE },
                { attribute: AttributeType.Speed, value: PENALTY_VALUE },
            ]);
            expect(armorItem.isActive).toBe(false);
        });

        it('should configure IceSword modifiers correctly', () => {
            const iceSwordItem: Item = {
                ...BASE_ITEM,
                id: 'IceSword',
                name: ItemName.IceSword,
            } as Item;

            service.applyItemModifiers(iceSwordItem);

            expect(iceSwordItem.modifiers).toEqual([{ attribute: AttributeType.Attack, value: BONUS_VALUE }]);
            expect(iceSwordItem.isActive).toBe(false);
        });

        it('should configure IceShield modifiers correctly', () => {
            const iceShieldItem: Item = {
                ...BASE_ITEM,
                id: 'IceShield',
                name: ItemName.IceShield,
            } as Item;

            service.applyItemModifiers(iceShieldItem);

            expect(iceShieldItem.modifiers).toEqual([{ attribute: AttributeType.Defense, value: BONUS_VALUE }]);
            expect(iceShieldItem.isActive).toBe(false);
        });
    });

    describe('condition checks', () => {
        it('should validate health condition correctly', () => {
            const iceSwordItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.IceSword,
            };

            const validPlayer = { ...MOCK_PLAYER, hp: { current: 3, max: 6 } };
            const valid = service.isHealthConditionValid(validPlayer, iceSwordItem);
            expect(valid).toBe(true);

            const invalidPlayer = { ...MOCK_PLAYER, hp: { current: 4, max: 6 } };
            const invalid = service.isHealthConditionValid(invalidPlayer, iceSwordItem);
            expect(invalid).toBe(false);
        });

        it('should validate ice condition correctly', () => {
            const iceShieldItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.IceShield,
            };

            const iceTile: Tile = { ...MOCK_TILE, type: TileType.Ice };
            const valid = service.isIceConditionValid(iceTile, iceShieldItem);
            expect(valid).toBe(true);

            const invalid = service.isIceConditionValid(MOCK_TILE, iceShieldItem);
            expect(invalid).toBe(false);
        });

        it('should return false when tile is undefined', () => {
            const iceShieldItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.IceShield,
            };
            const result = service['isIceConditionValid'](undefined, iceShieldItem);
            expect(result).toBe(false);
        });
    });
});
