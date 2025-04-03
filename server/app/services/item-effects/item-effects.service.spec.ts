/* eslint-disable @typescript-eslint/no-magic-numbers */
import { AttributeType, DiceType, ItemName } from '@app/enums/enums';
import { Item } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { TileType } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemEffectsService } from './item-effects.service';

describe('ItemEffectsService', () => {
    let service: ItemEffectsService;
    let eventEmitter: EventEmitter2;
    let gridManager: GridManagerService;

    const mockPlayer: Player = {
        name: '',
        avatar: '',
        speed: 0,
        vitality: 0,
        attack: {
            value: 0,
            bonusDice: DiceType.D6,
        },
        defense: {
            value: 0,
            bonusDice: DiceType.D4,
        },
        hp: {
            current: 0,
            max: 0,
        },
        movementPoints: 0,
        actionPoints: 0,
        inventory: [null, null],
        isAdmin: false,
        hasAbandoned: false,
        isActive: false,
        combatWon: 0,
    };

    const mockItem: Item = {
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
            service.addEffect(mockPlayer, mockItem, mockTile);
            expect(mockPlayer.attack.value).toBe(12);
            expect(mockPlayer.defense.value).toBe(4);
            expect(mockItem.isActive).toBe(true);
        });

        it('should not activate item if conditions fail', () => {
            const fireItem: Item = {
                id: 'fire1',
                name: ItemName.Fire,
                modifiers: [{ attribute: AttributeType.Attack, value: 2 }],
                isActive: false,
                imageSrc: '',
                imageSrcGrey: '',
                itemCounter: 0,
                description: '',
            };
            mockPlayer.hp.current = 60;

            service.addEffect(mockPlayer, fireItem, mockTile);
            expect(mockItem.isActive).toBe(false);
        });
    });

    describe('removeEffects', () => {
        it('should remove modifiers and deactivate item', () => {
            mockItem.isActive = true;
            mockPlayer.inventory[0] = mockItem;

            service.removeEffects(mockPlayer, 0);
            expect(mockPlayer.attack.value).toBe(8);
            expect(mockPlayer.defense.value).toBe(6);
            expect(mockItem.isActive).toBe(false);
        });
    });

    // describe('handleItemDropped', () => {
    //     it('should swap items between player and tile', () => {
    //         const tileItem: Item = {
    //             id: 'tile-item',
    //             name: ItemName.Rubik,
    //             modifiers: [],
    //             isActive: false,
    //             imageSrc: '',
    //             imageSrcGrey: '',
    //             itemCounter: 0,
    //             description: '',
    //         };
    //         mockTile.item = tileItem;
    //         mockPlayer.inventory[0] = mockItem;

    //         const result = service.handleItemDropped(mockPlayer, mockItem, [mockTile], 'test-code');

    //         expect(mockPlayer.inventory).toContain(tileItem);
    //         expect(mockTile.item).toBe(mockItem);
    //         expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.GameGridUpdate, expect.anything());
    //         expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.PlayerUpdate, expect.anything());
    //     });
    // });

    // describe('handlePlayerItemReset', () => {
    //     it('should reset player inventory and distribute items', () => {
    //         mockPlayer.inventory = [mockItem, mockItem];

    //         service.handlePlayerItemReset(mockPlayer, [mockTile], 'test-code');

    //         expect(mockPlayer.inventory).toEqual([null, null]);
    //         expect(mockTile.item).toBeDefined();
    //         expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    //     });
    // });

    // describe('addItemToPlayer', () => {
    //     it('should add item to empty inventory slot', () => {
    //         mockTile.item = mockItem;

    //         const result = service.addItemToPlayer(mockPlayer, mockItem, [mockTile], 'test-code');

    //         expect(mockPlayer.inventory).toContain(mockItem);
    //         expect(mockTile.item).toBeNull();
    //         expect(eventEmitter.emit).toHaveBeenCalled();
    //     });

    //     it('should trigger item choice when inventory is full', () => {
    //         mockPlayer.inventory = [mockItem, mockItem];
    //         mockTile.item = mockItem;

    //         const result = service.addItemToPlayer(mockPlayer, mockItem, [mockTile], 'test-code');

    //         expect(result.items).toHaveLength(3);
    //         expect(eventEmitter.emit).toHaveBeenCalledWith(EventEmit.ItemChoice, expect.anything());
    //     });
    // });

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
            const valid = service.isHealthConditionValid({ ...mockPlayer, hp: { current: 40, max: 100 } }, mockItem);
            const invalid = service.isHealthConditionValid({ ...mockPlayer, hp: { current: 60, max: 100 } }, mockItem);
            expect(valid).toBe(true);
            expect(invalid).toBe(false);
        });

        it('should validate ice condition correctly', () => {
            const iceTile: Tile = { ...mockTile, type: TileType.Ice };
            const valid = service.isIceConditionValid(iceTile, mockItem);
            const invalid = service.isIceConditionValid(mockTile, mockItem);
            expect(valid).toBe(true);
            expect(invalid).toBe(false);
        });
    });
});
