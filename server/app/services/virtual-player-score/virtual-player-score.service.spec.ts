/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-undef */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import {
    AGGRESSIVE_ITEM_SCORE,
    ALLY_ATTACK_PENALTY,
    ATTACK_SCORE,
    DEFENSE_ATTACK_SCORE,
    DEFENSIVE_ITEM_SCORE,
    FLAG_SCORE,
    INVALID_ITEM_PENALTY,
    NORMAL_ITEM_SCORE,
} from '@app/constants/constants';
import { MoveType } from '@app/enums/enums';
import { DiceType } from '@app/interfaces/dice';
import { Lobby } from '@app/interfaces/lobby';
import { Move } from '@app/interfaces/move';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { TileType } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtual-player-actions/virtual-player-actions.service';
import { VirtualPlayerScoreService } from './virtual-player-score.service';
import { TeamType, ItemName } from '@common/enums';

describe('VirtualPlayerScoreService', () => {
    let service: VirtualPlayerScoreService;
    let mockGridManagerService: jest.Mocked<GridManagerService>;
    let mockVirtualPlayerActions: jest.Mocked<VirtualPlayerActionsService>;

    const virtualPlayer: Player = {
        name: 'Bot',
        avatar: 'bot.png',
        speed: 3,
        attack: { value: 2, bonusDice: DiceType.D6 },
        defense: { value: 1, bonusDice: DiceType.D6 },
        hp: { current: 5, max: 5 },
        movementPoints: 3,
        actionPoints: 1,
        inventory: [null, null],
        isAdmin: false,
        isVirtual: true,
        hasAbandoned: false,
        isActive: true,
        combatWon: 0,
        team: TeamType.RED,
        spawnPoint: { tileId: 'spawn-1', x: 0, y: 0 },
    };

    const enemyPlayer: Player = {
        ...virtualPlayer,
        name: 'Enemy',
        team: TeamType.BLUE,
        inventory: [
            {
                name: ItemName.Flag,
                imageSrc: '',
                id: '',
                imageSrcGrey: '',
                itemCounter: 0,
                description: '',
            },
            null,
        ],
    };

    const mockTile: Tile = {
        id: 'tile-1',
        imageSrc: '',
        isOccupied: false,
        type: TileType.Default,
        isOpen: true,
        player: enemyPlayer,
    };

    const itemTile: Tile = {
        ...mockTile,
        item: {
            name: ItemName.Fire,
            imageSrc: '',
            id: '',
            imageSrcGrey: '',
            description: '',
            itemCounter: 0,
        },
    };

    const flagTile: Tile = {
        ...mockTile,
        item: {
            name: ItemName.Flag,
            imageSrc: '',
            id: '',
            imageSrcGrey: '',
            description: '',
            itemCounter: 0,
        },
    };

    const homeTile: Tile = {
        ...mockTile,
        id: 'spawn-1',
        item: {
            name: ItemName.Home,
            imageSrc: '',
            id: '',
            imageSrcGrey: '',
            description: '',
            itemCounter: 0,
        },
    };

    const lobby: Lobby = {
        isLocked: false,
        accessCode: 'ABCD',
        players: [virtualPlayer, enemyPlayer],
        maxPlayers: 4,
        waitingPlayers: [],
        game: {
            grid: [[mockTile]],
        } as any,
    };

    const sampleMoves: Move[] = [
        { tile: mockTile, inRange: true, type: MoveType.Attack },
        { tile: mockTile, inRange: false, type: MoveType.Item },
    ];

    beforeEach(async () => {
        mockGridManagerService = {
            findTileByPlayer: jest.fn().mockReturnValue(mockTile),
        } as any;
        mockVirtualPlayerActions = {
            getPathForMove: jest.fn().mockReturnValue([mockTile]),
            calculateTotalMovementCost: jest.fn().mockReturnValue(1),
            areOnSameTeam: jest.fn(),
            isFlagInInventory: jest.fn(),
        } as any;
        service = new VirtualPlayerScoreService(mockGridManagerService, mockVirtualPlayerActions);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should score aggressive moves correctly', () => {
        const scoredMoves = service.scoreAggressiveMoves([...sampleMoves], virtualPlayer, lobby);
        expect(mockGridManagerService.findTileByPlayer).toHaveBeenCalledWith(lobby.game.grid, virtualPlayer);
        expect(scoredMoves.length).toBe(2);
    });

    it('should score defensive moves correctly', () => {
        const scoredMoves = service.scoreDefensiveMoves([...sampleMoves], virtualPlayer, lobby);
        expect(mockGridManagerService.findTileByPlayer).toHaveBeenCalledWith(lobby.game.grid, virtualPlayer);
        expect(scoredMoves.length).toBe(2);
    });

    it('should call getVirtualPlayerTile and return correct tile', () => {
        const result = service.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        expect(result).toBe(mockTile);
        expect(mockGridManagerService.findTileByPlayer).toHaveBeenCalled();
    });

    describe('calculateMovementScore', () => {
        it('should not add in range bonus if movement cost exceeds points', () => {
            mockVirtualPlayerActions.calculateTotalMovementCost.mockReturnValue(10);
            const move: Move = { tile: mockTile, inRange: false, type: MoveType.Attack };
            const virtualPlayerTile = mockTile;

            service['calculateMovementScore'](move, virtualPlayerTile, virtualPlayer, lobby);

            expect(move.score).toBe(NaN);
        });

        it('should return early if no path found', () => {
            mockVirtualPlayerActions.getPathForMove.mockReturnValue(null);
            const move: Move = { tile: mockTile, inRange: false, type: MoveType.Attack, score: 0 };
            const virtualPlayerTile = mockTile;

            service['calculateMovementScore'](move, virtualPlayerTile, virtualPlayer, lobby);

            expect(move.score).toBe(0);
        });
    });

    describe('calculateAttackScore', () => {
        it('should add attack score for enemy', () => {
            mockVirtualPlayerActions.areOnSameTeam.mockReturnValue(false);
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(false);
            const move: Move = {
                tile: mockTile,
                type: MoveType.Attack,
                score: 0,
                inRange: false,
            };

            service['calculateAttackScore'](move, virtualPlayer);

            expect(move.score).toBe(ATTACK_SCORE);
        });

        it('should add flag score for flag carrier', () => {
            mockVirtualPlayerActions.areOnSameTeam.mockReturnValue(false);
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(true);
            const move: Move = {
                tile: mockTile,
                type: MoveType.Attack,
                score: 0,
                inRange: false,
            };

            service['calculateAttackScore'](move, virtualPlayer);

            expect(move.score).toBe(FLAG_SCORE);
        });

        it('should add penalty for ally attack', () => {
            mockVirtualPlayerActions.areOnSameTeam.mockReturnValue(true);
            const move: Move = {
                tile: mockTile,
                type: MoveType.Attack,
                score: 0,
                inRange: false,
            };

            service['calculateAttackScore'](move, virtualPlayer);

            expect(move.score).toBe(ALLY_ATTACK_PENALTY);
        });
    });

    describe('calculateDefensiveAttackScore', () => {
        it('should add defensive attack score for enemy', () => {
            mockVirtualPlayerActions.areOnSameTeam.mockReturnValue(false);
            const move: Move = {
                tile: mockTile,
                type: MoveType.Attack,
                score: 0,
                inRange: false,
            };

            service['calculateDefensiveAttackScore'](move, virtualPlayer);

            expect(move.score).toBe(DEFENSE_ATTACK_SCORE);
        });

        it('should add penalty for ally attack', () => {
            mockVirtualPlayerActions.areOnSameTeam.mockReturnValue(true);
            const move: Move = {
                tile: mockTile,
                type: MoveType.Attack,
                score: 0,
                inRange: false,
            };

            service['calculateDefensiveAttackScore'](move, virtualPlayer);

            expect(move.score).toBe(ALLY_ATTACK_PENALTY);
        });
    });

    describe('calculateItemScore', () => {
        it('should add aggressive item score for fire/potion', () => {
            const move: Move = {
                tile: itemTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['calculateItemScore'](move, virtualPlayer);

            expect(move.score).toBe(AGGRESSIVE_ITEM_SCORE);
        });

        it('should add flag score for flag', () => {
            const move: Move = {
                tile: flagTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['calculateItemScore'](move, virtualPlayer);

            expect(move.score).toBe(FLAG_SCORE);
        });

        it('should call handleHomeItemScore when item is Home', () => {
            const move: Move = {
                tile: {
                    ...mockTile,
                    item: {
                        name: ItemName.Home,
                        imageSrc: '',
                        id: '',
                        imageSrcGrey: '',
                        description: '',
                        itemCounter: 0,
                    },
                },
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            const spy = jest.spyOn(service as any, 'handleHomeItemScore');

            service['calculateItemScore'](move, virtualPlayer);

            expect(spy).toHaveBeenCalledWith(move, virtualPlayer);
        });
        it('should add invalid penalty for unknown item', () => {
            const move: Move = {
                tile: {
                    ...mockTile,
                    item: {
                        name: 'UnknownItem' as ItemName,
                        imageSrc: '',
                        id: '',
                        imageSrcGrey: '',
                        description: '',
                        itemCounter: 0,
                    },
                },
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['calculateItemScore'](move, virtualPlayer);

            expect(move.score).toBe(INVALID_ITEM_PENALTY);
        });
    });

    describe('calculateDefensiveItemScore', () => {
        it('should add defensive item score for swap/rubik', () => {
            const swapTile = {
                ...mockTile,
                item: {
                    name: ItemName.Swap,
                    imageSrc: '',
                    id: 'swap-item-id',
                    imageSrcGrey: '',
                    description: 'Swap item description',
                    itemCounter: 0,
                },
            };
            const move: Move = {
                tile: swapTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['calculateDefensiveItemScore'](move, virtualPlayer, lobby);

            expect(move.score).toBe(DEFENSIVE_ITEM_SCORE);
        });

        it('should add flag score for flag', () => {
            const move: Move = {
                tile: flagTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['calculateDefensiveItemScore'](move, virtualPlayer, lobby);

            expect(move.score).toBe(FLAG_SCORE);
        });

        it('should handle home item score correctly', () => {
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(true);
            const move: Move = {
                tile: homeTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['calculateDefensiveItemScore'](move, virtualPlayer, lobby);

            expect(move.score).toBe(FLAG_SCORE);
        });

        it('should add normal score for other items', () => {
            const otherItemTile = {
                ...mockTile,
                item: {
                    name: 'Other',
                    imageSrc: '',
                    id: 'other-item-id',
                    imageSrcGrey: '',
                    description: 'Other item description',
                    itemCounter: 0,
                },
            };
            const move: Move = {
                tile: otherItemTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['calculateDefensiveItemScore'](move, virtualPlayer, lobby);

            expect(move.score).toBe(NORMAL_ITEM_SCORE);
        });
    });

    describe('handleHomeItemScore', () => {
        it('should add flag score when has flag and is spawn point', () => {
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(true);
            const move: Move = {
                tile: homeTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['handleHomeItemScore'](move, virtualPlayer);

            expect(move.score).toBe(FLAG_SCORE);
        });

        it('should add invalid penalty when conditions not met', () => {
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(false);
            const move: Move = {
                tile: homeTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['handleHomeItemScore'](move, virtualPlayer);

            expect(move.score).toBe(INVALID_ITEM_PENALTY);
        });
    });

    describe('handleDefensiveHomeItemScore', () => {
        it('should add flag score when on own spawn with flag', () => {
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(true);
            const move: Move = {
                tile: homeTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['handleDefensiveHomeItemScore'](move, virtualPlayer, lobby);

            expect(move.score).toBe(FLAG_SCORE);
        });

        it('should add flag score when on flag carrier spawn', () => {
            const flagCarrierSpawnTile = { ...homeTile, id: 'flag-carrier-spawn' };
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(false);
            const modifiedLobby = {
                ...lobby,
                players: [{ ...enemyPlayer, spawnPoint: { tileId: 'flag-carrier-spawn', x: 0, y: 0 } }],
            };
            const move: Move = {
                tile: flagCarrierSpawnTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['handleDefensiveHomeItemScore'](move, virtualPlayer, modifiedLobby);

            expect(move.score).toBe(FLAG_SCORE);
        });

        it('should add invalid penalty when conditions not met', () => {
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(false);
            const move: Move = {
                tile: homeTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };

            service['handleDefensiveHomeItemScore'](move, virtualPlayer, lobby);

            expect(move.score).toBe(INVALID_ITEM_PENALTY);
        });
        it('should add invalid penalty when not own spawn and not flag carrier spawn', () => {
            mockVirtualPlayerActions.isFlagInInventory.mockReturnValue(false);

            const unrelatedTile = {
                ...homeTile,
                id: 'unrelated-tile',
            };

            const move: Move = {
                tile: unrelatedTile,
                type: MoveType.Item,
                score: 0,
                inRange: false,
            };
            const modifiedLobby = {
                ...lobby,
                players: [enemyPlayer],
            };

            service['handleDefensiveHomeItemScore'](move, virtualPlayer, modifiedLobby);

            expect(move.score).toBe(INVALID_ITEM_PENALTY);
        });
    });

    describe('findFlagCarrier', () => {
        it('should find flag carrier from enemy team', () => {
            const result = service['findFlagCarrier'](lobby, virtualPlayer);
            expect(result).toBe(enemyPlayer);
        });
    });
});
