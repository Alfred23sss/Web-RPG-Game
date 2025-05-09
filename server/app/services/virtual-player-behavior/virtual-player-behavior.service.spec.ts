/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/lobby';
import { Move } from '@app/interfaces/move';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { Item } from '@app/model/database/item';
import { TileType } from '@app/model/database/tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtual-player-actions/virtual-player-actions.service';
import { VirtualPlayerScoreService } from '@app/services/virtual-player-score/virtual-player-score.service';
import { Behavior } from '@common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerBehaviorService } from './virtual-player-behavior.service';

describe('VirtualPlayerBehaviorService', () => {
    let service: VirtualPlayerBehaviorService;
    let mockGameCombatService: Partial<GameCombatService>;
    let mockVirtualPlayerActions: Partial<VirtualPlayerActionsService>;
    let mockVirtualPlayerScoreService: Partial<VirtualPlayerScoreService>;

    beforeEach(async () => {
        mockGameCombatService = {
            isCombatActive: jest.fn(),
            getCombatState: jest.fn(),
            attemptEscape: jest.fn(),
            performAttack: jest.fn(),
        };

        mockVirtualPlayerActions = {
            moveToAttack: jest.fn().mockResolvedValue(undefined),
            pickUpItem: jest.fn().mockResolvedValue(undefined),
            calculateTotalMovementCost: jest.fn().mockReturnValue(0),
            getPathForMove: jest.fn().mockReturnValue([]),
            getRandomDelay: jest.fn().mockReturnValue(100),
        };

        mockVirtualPlayerScoreService = {
            getVirtualPlayerTile: jest.fn().mockReturnValue({} as Tile),
            scoreAggressiveMoves: jest.fn().mockImplementation((moves) => moves),
            scoreDefensiveMoves: jest.fn().mockImplementation((moves) => moves),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerBehaviorService,
                { provide: GameCombatService, useValue: mockGameCombatService },
                { provide: VirtualPlayerActionsService, useValue: mockVirtualPlayerActions },
                { provide: VirtualPlayerScoreService, useValue: mockVirtualPlayerScoreService },
            ],
        }).compile();

        service = module.get<VirtualPlayerBehaviorService>(VirtualPlayerBehaviorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('executeBehavior', () => {
        it('should execute the highest-scored move', async () => {
            const mockMove = { type: MoveType.Attack } as Move;
            const mockVirtualPlayer = { behavior: Behavior.Aggressive } as VirtualPlayer;
            const mockLobby = { game: { grid: [] } } as Lobby;
            const mockMoves = [mockMove];

            jest.spyOn(service as any, 'getNextMove').mockReturnValue(mockMove);

            await service.executeBehavior(mockVirtualPlayer, mockLobby, mockMoves);

            expect(mockVirtualPlayerScoreService.getVirtualPlayerTile).toHaveBeenCalled();
            expect(mockVirtualPlayerActions.moveToAttack).toHaveBeenCalledWith(mockMove, expect.anything(), mockLobby, mockVirtualPlayer);
        });
    });

    describe('tryToEscapeIfWounded', () => {
        it('should return false if not in combat', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(false);
            const result = await service.tryToEscapeIfWounded({} as Player, '1234');
            expect(result).toBe(false);
        });

        it('should return false if not current fighter', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(true);
            (mockGameCombatService.getCombatState as jest.Mock).mockReturnValue({ currentFighter: { name: 'other' } });
            const result = await service.tryToEscapeIfWounded({ name: 'test' } as Player, '1243');
            expect(result).toBe(false);
        });

        it('should not escape with full health', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(true);
            (mockGameCombatService.getCombatState as jest.Mock).mockReturnValue({ currentFighter: { name: 'test' } });
            const mockPlayer = { name: 'test', hp: { current: 100, max: 100 } };

            const result = await service.tryToEscapeIfWounded(mockPlayer as Player, '1234');

            expect(result).toBe(false);
        });

        it('should attempt escape when wounded and escape attempts are available', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(true);
            (mockGameCombatService.getCombatState as jest.Mock).mockReturnValue({
                currentFighter: { name: 'bot' },
                remainingEscapeAttempts: new Map([['bot', 1]]),
            });

            const mockPlayer = { name: 'bot', hp: { current: 5, max: 10 } } as Player;

            const result = await service.tryToEscapeIfWounded(mockPlayer, '1234');

            expect(mockVirtualPlayerActions.getRandomDelay).toHaveBeenCalled();
            expect(mockGameCombatService.attemptEscape).toHaveBeenCalledWith('1234', mockPlayer);
            expect(result).toBe(true);
        });

        it('should perform attack when wounded and no escape attempts left', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(true);
            (mockGameCombatService.getCombatState as jest.Mock).mockReturnValue({
                currentFighter: { name: 'bot' },
                remainingEscapeAttempts: new Map([['bot', 0]]),
            });

            const mockPlayer = { name: 'bot', hp: { current: 2, max: 10 } } as Player;

            (mockGameCombatService.performAttack as jest.Mock) = jest.fn();

            const result = await service.tryToEscapeIfWounded(mockPlayer, '1234');

            expect(mockVirtualPlayerActions.getRandomDelay).toHaveBeenCalled();
            expect(mockGameCombatService.performAttack).toHaveBeenCalledWith('1234', 'bot');
            expect(result).toBe(true);
        });
    });

    describe('getNextMove', () => {
        const mockLobby = {
            game: {
                grid: [],
            },
        } as unknown as Lobby;

        const createMockMove = (score?: number): Move => ({
            type: MoveType.Attack,
            tile: {
                item: { name: 'test-item' } as Item,
                id: 'tile-0-0',
                type: TileType.Default,
            } as Tile,
            score,
            inRange: true,
        });

        it('should return undefined with no moves', () => {
            const result = (service as any).getNextMove([], {} as VirtualPlayer, mockLobby);
            expect(result).toBeUndefined();
        });

        it('should score moves for aggressive behavior', () => {
            const mockMoves = [createMockMove()];
            const mockPlayer = { behavior: Behavior.Aggressive } as VirtualPlayer;

            (service as any).getNextMove(mockMoves, mockPlayer, mockLobby);

            expect(mockVirtualPlayerScoreService.scoreAggressiveMoves).toHaveBeenCalledWith(mockMoves, mockPlayer, mockLobby);
        });

        it('should score moves for defensive behavior', () => {
            const mockMoves = [createMockMove()];
            const mockPlayer = { behavior: Behavior.Defensive } as VirtualPlayer;

            (service as any).getNextMove(mockMoves, mockPlayer, mockLobby);

            expect(mockVirtualPlayerScoreService.scoreDefensiveMoves).toHaveBeenCalledWith(mockMoves, mockPlayer, mockLobby);
        });

        it('should sort moves by score', () => {
            const mockMoves = [createMockMove(2), createMockMove(3)];

            const result = (service as any).getNextMove(mockMoves, { behavior: Behavior.Aggressive } as VirtualPlayer, mockLobby);

            expect(result.score).toBe(3);
        });
    });

    describe('getNextMove Edge Cases', () => {
        const mockLobby = {
            game: {
                grid: [],
            },
        } as unknown as Lobby;

        const createMockMove = (partialMove: Partial<Move>): Move => ({
            type: MoveType.Attack,
            tile: {
                item: null,
                id: 'tile-0-0',
                type: TileType.Default,
            } as Tile,
            score: undefined,
            inRange: true,
            ...partialMove,
        });

        it('should handle undefined scores using OR fallback', () => {
            const mockMoves = [createMockMove({ score: undefined }), createMockMove({ score: undefined })];

            const result = (service as any).getNextMove(mockMoves, { behavior: Behavior.Aggressive } as VirtualPlayer, mockLobby);

            expect(result.score).toBe(undefined);
        });

        it('should handle null scores using OR fallback', () => {
            const mockMoves = [createMockMove({ score: null as unknown as number }), createMockMove({ score: 3 })];

            const result = (service as any).getNextMove(mockMoves, { behavior: Behavior.Defensive } as VirtualPlayer, mockLobby);

            expect(result.score).toBe(3);
        });

        it('should handle zero scores correctly', () => {
            const mockMoves = [createMockMove({ score: 0 }), createMockMove({ score: 1 })];

            const result = (service as any).getNextMove(mockMoves, { behavior: Behavior.Aggressive } as VirtualPlayer, mockLobby);

            expect(result.score).toBe(1);
        });
    });

    describe('attack', () => {
        it('should return early if combat is not active', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(false);

            await service.attack({ name: 'bot' } as Player, '1234');

            expect(mockGameCombatService.getCombatState).not.toHaveBeenCalled();
        });

        it('should return early if combat state is undefined', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(true);
            (mockGameCombatService.getCombatState as jest.Mock).mockReturnValue(undefined);

            await service.attack({ name: 'bot' } as Player, '1234');

            expect(mockGameCombatService.performAttack).not.toHaveBeenCalled();
        });

        it('should return early if current fighter is not the virtual player', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(true);
            (mockGameCombatService.getCombatState as jest.Mock).mockReturnValue({
                currentFighter: { name: 'other' },
            });

            await service.attack({ name: 'bot' } as Player, '1234');

            expect(mockGameCombatService.performAttack).not.toHaveBeenCalled();
        });

        it('should perform attack if combat is active and current fighter is virtual player', async () => {
            (mockGameCombatService.isCombatActive as jest.Mock).mockReturnValue(true);
            (mockGameCombatService.getCombatState as jest.Mock).mockReturnValue({
                currentFighter: { name: 'bot' },
            });

            const performAttackSpy = jest.fn();
            (mockGameCombatService.performAttack as jest.Mock) = performAttackSpy;

            const mockPlayer = { name: 'bot' } as Player;

            await service.attack(mockPlayer, '1234');

            expect(mockVirtualPlayerActions.getRandomDelay).toHaveBeenCalled();
            expect(performAttackSpy).toHaveBeenCalledWith('1234', 'bot');
        });
    });

    describe('executeNextMove', () => {
        it('should handle attack moves', async () => {
            const mockMove = { type: MoveType.Attack } as Move;
            await (service as any).executeNextMove(mockMove, {} as Tile, {} as Lobby);
            expect(mockVirtualPlayerActions.moveToAttack).toHaveBeenCalled();
        });

        it('should handle item moves', async () => {
            const mockMove = { type: MoveType.Item } as Move;
            await (service as any).executeNextMove(mockMove, {} as Tile, {} as Lobby);
            expect(mockVirtualPlayerActions.pickUpItem).toHaveBeenCalled();
        });
    });
});
