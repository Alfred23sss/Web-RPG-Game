/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from 'eventemitter2';
import { VirtualPlayerService } from './virtualPlayer.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { VirtualPlayerBehaviorService } from '@app/services/virtual-player-behavior/virtualPlayerBehavior.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Behavior, MoveType } from '@app/enums/enums';
import { AGGRESSIVE_ITEM_ORDER } from '@app/constants/constants';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtualPlayer.gateway.events';
import { Item } from '@app/interfaces/Item';
import { Tile } from '@app/interfaces/Tile';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;
    let mockEventEmitter: EventEmitter2;
    let mockBehaviorService: VirtualPlayerBehaviorService;
    let mockLobbyService: LobbyService;
    let mockActionsService: VirtualPlayerActionsService;

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
                        tryToEscapeIfWounded: jest.fn(),
                        executeBehavior: jest.fn(),
                    },
                },
                {
                    provide: LobbyService,
                    useValue: {
                        getLobby: jest.fn(),
                    },
                },
                {
                    provide: VirtualPlayerActionsService,
                    useValue: {
                        getRandomDelay: jest.fn().mockReturnValue(0),
                        checkAvailableActions: jest.fn().mockReturnValue(true),
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

    describe('itemChoice', () => {
        const sampleItems = [{ name: 'Shield' }, { name: 'Sword' }, { name: 'Potion' }] as any[];

        it('should return null if behavior is null', () => {
            const result = service.itemChoice(Behavior.Null, sampleItems);
            expect(result).toBeUndefined();
        });

        it('should choose item not in preference list', () => {
            const result = service.itemChoice(Behavior.Aggressive, sampleItems);
            const chosenItems = AGGRESSIVE_ITEM_ORDER.filter((name) => sampleItems.find((i) => i.name === name));
            expect(chosenItems.length).toBeLessThanOrEqual(2);
            expect(result).toBeDefined();
        });
    });

    describe('resetStats', () => {
        it('should restore virtualPlayer stats', () => {
            const mockVP = {
                movementPoints: 2,
                actionPoints: 1,
            };
            // @ts-ignore: force private var
            service.virtualPlayer = mockVP;
            // @ts-ignore: force private var
            service.movementPoints = 5;
            // @ts-ignore: force private var
            service.actionsPoints = 3;

            service.resetStats();
            expect(mockVP.movementPoints).toBe(5);
            expect(mockVP.actionPoints).toBe(3);
        });
    });

    describe('handleTurnStart', () => {
        it('should set virtualPlayer and call delay if isVirtual', () => {
            const delaySpy = jest.spyOn<any, any>(service, 'delay');
            const vPlayer = {
                isVirtual: true,
                movementPoints: 1,
                actionPoints: 2,
            };
            service.handleTurnStart('1234', vPlayer as any);
            expect(delaySpy).toHaveBeenCalledWith('1234');
        });

        it('should not call delay if not virtual', () => {
            const delaySpy = jest.spyOn<any, any>(service, 'delay');
            const vPlayer = { isVirtual: false };
            service.handleTurnStart('1234', vPlayer as any);
            expect(delaySpy).not.toHaveBeenCalled();
        });
    });

    describe('handleCombatTurnStart', () => {
        it('should call tryToEscapeIfWounded if behavior is Defensive', async () => {
            const mockVP = {
                isVirtual: true,
                behavior: Behavior.Defensive,
            };
            (mockBehaviorService.tryToEscapeIfWounded as jest.Mock).mockResolvedValue(true);

            await service.handleCombatTurnStart('abcd', mockVP as any);
            expect(mockBehaviorService.tryToEscapeIfWounded).toHaveBeenCalledWith(mockVP, 'abcd');
        });

        it('should skip escape if not defensive', async () => {
            const mockVP = {
                isVirtual: true,
                behavior: Behavior.Aggressive,
            };
            await service.handleCombatTurnStart('abcd', mockVP as any);
            expect(mockBehaviorService.tryToEscapeIfWounded).not.toHaveBeenCalled();
        });
    });

    describe('executeVirtualPlayerTurn', () => {
        it('should emit end turn if no available actions', () => {
            const vp = { name: 'Bot' };
            const lobby = {
                game: {
                    grid: [],
                },
            };
            // @ts-ignore
            service.virtualPlayer = vp;
            (mockLobbyService.getLobby as jest.Mock).mockReturnValue(lobby);
            (mockActionsService.checkAvailableActions as jest.Mock).mockReturnValue(false);

            // @ts-ignore
            service['executeVirtualPlayerTurn']('x123');

            expect(mockEventEmitter.emit).toHaveBeenCalledWith(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode: 'x123' });
        });

        it('should call executeBehavior if available actions', () => {
            const vp = { name: 'Bot' };
            const lobby = {
                game: {
                    grid: [[{ player: null }]],
                },
            };
            // @ts-ignore
            service.virtualPlayer = vp;
            (mockLobbyService.getLobby as jest.Mock).mockReturnValue(lobby);
            (mockActionsService.checkAvailableActions as jest.Mock).mockReturnValue(true);

            service['executeVirtualPlayerTurn']('y789');

            expect(mockBehaviorService.executeBehavior).toHaveBeenCalled();
        });

        it('should select up to 2 items from the behavior order', () => {
            const behavior = Behavior.Aggressive;
            const mockItems: Item[] = AGGRESSIVE_ITEM_ORDER.slice(0, 3).map((name, index) => ({
                name,
                id: `item-${index}`,
                imageSrc: 'image.png',
                imageSrcGrey: 'image-grey.png',
                itemCounter: 1,
                description: `Description for ${name}`,
            }));
            const removedItem = service.itemChoice(behavior, mockItems);
            expect(removedItem.name).toBe(mockItems[2].name);
        });
        it('should return moves for non-virtual players on the grid', () => {
            const mockPlayer = { name: 'Player1' };
            const mockTile: Tile = {
                player: mockPlayer,
            } as Tile;

            const grid: Tile[][] = [[mockTile]];

            (service as any).virtualPlayer = { name: 'AI' };

            const result = (service as any).findPlayers(grid);

            expect(result.length).toBe(1);
            expect(result[0].tile.player.name).toBe('Player1');
            expect(result[0].type).toBe(MoveType.Attack);
            expect(result[0].inRange).toBe(false);
        });
        it('should return moves for tiles with items', () => {
            const mockItem: Item = {
                id: 'item1',
                name: 'Sword',
                imageSrc: '',
                imageSrcGrey: '',
                itemCounter: 1,
                description: '',
            };

            const grid: Tile[][] = [[{ item: mockItem } as Tile], [{} as Tile]];

            const result = (service as any).findItems(grid);

            expect(result.length).toBe(1);
            expect(result[0].tile.item.name).toBe('Sword');
            expect(result[0].type).toBe(MoveType.Item);
            expect(result[0].inRange).toBe(false);
        });
    });
    describe('VirtualPlayerService - itemChoice', () => {
        beforeEach(() => {
            service = new VirtualPlayerService(null, null, null, null);
        });

        const mockItems: Item[] = [
            { name: 'Sword', id: '1', imageSrc: '', imageSrcGrey: '', itemCounter: 1, description: '' },
            { name: 'Bomb', id: '2', imageSrc: '', imageSrcGrey: '', itemCounter: 1, description: '' },
            { name: 'Shield', id: '3', imageSrc: '', imageSrcGrey: '', itemCounter: 1, description: '' },
        ];

        it('should return the item not selected when behavior is Aggressive (i.e. uses AGGRESSIVE_ITEM_ORDER)', () => {
            const removedItem = service.itemChoice(Behavior.Aggressive, mockItems);
            expect(removedItem?.name).toBe('Sword');
        });

        it('should return the item not selected when behavior is Defensive (i.e. uses DEFENSIVE_ITEM_ORDER)', () => {
            const removedItem = service.itemChoice(Behavior.Defensive, mockItems);
            expect(['Sword', 'Bomb']).toContain(removedItem?.name);
        });

        it('should return undefined if behavior is Null', () => {
            const result = service.itemChoice(Behavior.Null, mockItems);
            expect(result).toBeUndefined();
        });

        it('should return the first item NOT selected when there is a leftover item (removed is truthy)', () => {
            const result = service.itemChoice(Behavior.Aggressive, mockItems);
            expect(result?.name).toBe('Sword');
        });
    });
});
