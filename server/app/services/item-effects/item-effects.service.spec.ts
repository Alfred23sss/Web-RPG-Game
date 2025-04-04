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

fdescribe('ItemEffectsService', () => {
    let service: ItemEffectsService;
    let eventEmitter: EventEmitter2;
    let gridManager: GridManagerService;

    const MOCK_PLAYER: Player = {
        name: '',
        avatar: '',
        speed: 4,
        vitality: 4,
        attack: {
            value: 4,
            bonusDice: DiceType.D6,
        },
        defense: {
            value: 4,
            bonusDice: DiceType.D4,
        },
        hp: {
            current: 4,
            max: 4,
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
        id: 'item1',
        name: ItemName.Potion,
        modifiers: [
            { attribute: AttributeType.Attack, value: 2 },
            { attribute: AttributeType.Defense, value: -1 },
        ],
        isActive: false,
        imageSrc: '',
        imageSrcGrey: '',
        itemCounter: 0,
        description: '',
    };

    const mockTile: Tile = {
        id: '',
        imageSrc: '',
        isOccupied: false,
        isOpen: false,
        type: TileType.Water,
    };

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
                        findTileByPlayer: jest.fn().mockReturnValue(mockTile),
                        findClosestAvailableTile: jest.fn().mockReturnValue(mockTile),
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
        it('should apply modifiers and activate item', () => {
            service.addEffect(MOCK_PLAYER, MOCK_ITEM, mockTile);
            expect(MOCK_PLAYER.attack.value).toBe(6);
            expect(MOCK_PLAYER.defense.value).toBe(3);
            expect(MOCK_ITEM.isActive).toBe(true);
        });

        it('should apply modifiers and activate item', () => {
            const mockItem = {
                ...MOCK_ITEM,
                name: ItemName.Potion,
                modifiers: [
                    { attribute: AttributeType.Speed, value: 2 },
                    { attribute: AttributeType.Hp, value: -1 },
                ],
            };
            service.addEffect(MOCK_PLAYER, mockItem, mockTile);
            expect(MOCK_PLAYER.attack.value).toBe(6);
            expect(MOCK_PLAYER.defense.value).toBe(3);
            expect(MOCK_ITEM.isActive).toBe(true);
        });

        it('should apply modifiers and activate item', () => {
            const mockItem = {
                ...MOCK_ITEM,
                modifiers: [],
            };
            service.addEffect(MOCK_PLAYER, mockItem, mockTile);
            expect(MOCK_PLAYER.attack.value).toBe(6);
            expect(MOCK_PLAYER.defense.value).toBe(3);
            expect(MOCK_ITEM.isActive).toBe(true);
        });

        it('should apply modifiers and activate item', () => {
            service.addEffect(MOCK_PLAYER, MOCK_ITEM, mockTile);
            expect(MOCK_PLAYER.attack.value).toBe(6);
            expect(MOCK_PLAYER.defense.value).toBe(3);
            expect(MOCK_ITEM.isActive).toBe(true);
        });

        it('should not activate item if conditions fail', () => {
            const fireItem: Item = {
                ...MOCK_ITEM,
                name: ItemName.Fire,
                modifiers: null,
                isActive: false,
            };
            MOCK_PLAYER.hp.current = 4;
            MOCK_PLAYER.hp.max = 6;

            service.addEffect(MOCK_PLAYER, fireItem, mockTile);
            expect(fireItem.isActive).toBe(false);
        });
    });

    describe('removeEffects', () => {
        it('should remove modifiers and deactivate item', () => {
            const testItem: Item = {
                ...MOCK_ITEM,
                isActive: true,
            };
            const testPlayer = { ...MOCK_PLAYER, attack: { value: 6, bonusDice: DiceType.D6 }, defense: { value: 3, bonusDice: DiceType.D4 } };
            MOCK_PLAYER.inventory[0] = testItem;

            service.removeEffects(testPlayer, 0);
            expect(testPlayer.attack.value).toBe(4);
            expect(testPlayer.defense.value).toBe(4);
            expect(testItem.isActive).toBe(false);
        });
    });

    describe('handleItemDropped', () => {
        it('should swap items between player and tile', () => {
            const tileItem: Item = {
                id: 'tile-item',
                name: ItemName.Rubik,
                modifiers: [],
                isActive: false,
                imageSrc: '',
                imageSrcGrey: '',
                itemCounter: 0,
                description: '',
            };
            mockTile.item = tileItem;
            MOCK_PLAYER.inventory[0] = MOCK_ITEM;

            service.handleItemDropped(MOCK_PLAYER, MOCK_ITEM, [[mockTile]], 'test-code');

            expect(MOCK_PLAYER.inventory).toContain(tileItem);
            expect(mockTile.item).toBe(MOCK_ITEM);
            expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.GameGridUpdate, expect.anything());
            expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.PlayerUpdate, expect.anything());
        });
    });

    describe('handlePlayerItemReset', () => {
        it('should reset player inventory and distribute items', () => {
            MOCK_PLAYER.inventory = [MOCK_ITEM, MOCK_ITEM];
            const result = service.handlePlayerItemReset(MOCK_PLAYER, [[mockTile]], 'test-code');

            expect(result.player.inventory).toEqual([null, null]);
            expect(mockTile.item).toBeDefined();
            expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
        });
    });

    describe('addItemToPlayer', () => {
        it('should add item to empty inventory slot', () => {
            mockTile.item = MOCK_ITEM;
            MOCK_PLAYER.inventory = [null, null];

            service.addItemToPlayer(MOCK_PLAYER, MOCK_ITEM, [[mockTile]], 'test-code');

            expect(MOCK_PLAYER.inventory).toContain(MOCK_ITEM);
            expect(mockTile.item).toBeNull();
            expect(eventEmitter.emit).toHaveBeenCalled();
        });

        it('should trigger item choice when inventory is full', () => {
            MOCK_PLAYER.inventory = [MOCK_ITEM, MOCK_ITEM];
            mockTile.item = MOCK_ITEM;

            const result = service.addItemToPlayer(MOCK_PLAYER, MOCK_ITEM, [[mockTile]], 'test-code');

            expect(result.items).toHaveLength(3);
            expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.ItemChoice, expect.anything());
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

            const iceTile: Tile = { ...mockTile, type: TileType.Ice };
            const valid = service.isIceConditionValid(iceTile, swapItem);
            expect(valid).toBe(true);

            const nonIceTile: Tile = { ...mockTile, type: TileType.Water };
            const invalid = service.isIceConditionValid(nonIceTile, swapItem);
            expect(invalid).toBe(false);
        });
    });
});
