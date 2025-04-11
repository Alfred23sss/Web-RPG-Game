/* eslint-disable @typescript-eslint/no-magic-numbers */ // approved by education team, disabling magic numbers and any in test are allowed
/* eslint-disable @typescript-eslint/no-explicit-any */ // To test private methods
import { ItemName, TileType } from '@app/enums/enums';
import { CombatState } from '@app/interfaces/CombatState';
import { Player } from '@app/model/database/player';
import { Tile } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CombatHelperService } from './combat-helper.service';
import { DiceType } from '@app/interfaces/Dice';

describe('CombatHelperService', () => {
    let service: CombatHelperService;
    let gridManagerService: GridManagerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatHelperService,
                {
                    provide: GridManagerService,
                    useValue: {
                        findTileByPlayer: jest.fn(),
                        findTileBySpawnPoint: jest.fn(),
                        teleportPlayer: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CombatHelperService>(CombatHelperService);
        gridManagerService = module.get<GridManagerService>(GridManagerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should determine combat order correctly if attacker as more speed then defender', () => {
        const player1 = { speed: 5 } as Player;
        const player2 = { speed: 3 } as Player;
        expect(service.determineCombatOrder(player1, player2)).toEqual([player1, player2]);
    });

    it('should determine combat order correctly if defender as more speed then attacker', () => {
        const player2 = { speed: 5 } as Player;
        const player1 = { speed: 3 } as Player;
        expect(service.determineCombatOrder(player1, player2)).toEqual([player2, player1]);
    });

    it('should return attacker first if speeds are equal', () => {
        const player1 = { speed: 5 } as Player;
        const player2 = { speed: 5 } as Player;
        expect(service.determineCombatOrder(player1, player2)).toEqual([player1, player2]);
    });

    it('should return correct combat order when speeds are equal', () => {
        const player1 = { speed: 5 } as Player;
        const player2 = { speed: 5 } as Player;
        expect(service.determineCombatOrder(player1, player2)).toEqual([player1, player2]);
    });

    it('should apply correct attack score without ice penalty', () => {
        const player = { attack: { value: 5, bonusDice: 'D6' } } as unknown as Player;
        (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(undefined);
        expect(service.getRandomAttackScore(player, false, [[]])).toBeGreaterThanOrEqual(6);
    });

    it('should apply correct defense score without ice penalty', () => {
        const player = { defense: { value: 5, bonusDice: 'D6' } } as unknown as Player;
        (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(undefined);
        expect(service.getRandomDefenseScore(player, false, [[]])).toBeGreaterThanOrEqual(6);
    });

    it('should return predictable values in debug mode', () => {
        const player = { attack: { value: 5, bonusDice: 'D6' }, defense: { value: 5, bonusDice: 'D6' } } as unknown as Player;
        (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(undefined);
        expect(service.getRandomAttackScore(player, true, [[]])).toBe(11);
        expect(service.getRandomDefenseScore(player, true, [[]])).toBe(11);
    });

    it('should return correct defense score', () => {
        const defender = { defense: { value: 5, bonusDice: 'd6' } } as unknown as Player;
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        expect(service.getRandomDefenseScore(defender, false, [])).toBeGreaterThan(5);
        jest.spyOn(global.Math, 'random').mockRestore();
    });

    it('should return correct attack score', () => {
        const attacker = { attack: { value: 5, bonusDice: 'd6' } } as unknown as Player;
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        expect(service.getRandomAttackScore(attacker, false, [])).toBeGreaterThan(5);
        jest.spyOn(global.Math, 'random').mockRestore();
    });

    it('should apply ice penalty on attack and defense', () => {
        const player = { attack: { value: 5, bonusDice: 'd6' }, defense: { value: 5, bonusDice: 'd6' } } as unknown as Player;
        const tile = { type: TileType.Ice } as Tile;
        (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(tile);
        expect(service.getRandomAttackScore(player, false, [[]])).toBeLessThanOrEqual(9);
        expect(service.getRandomDefenseScore(player, false, [[]])).toBeLessThanOrEqual(9);
    });

    it('should reset loser player position', () => {
        const player = {} as Player;
        const grid = [[{} as Tile]];
        (gridManagerService.findTileBySpawnPoint as jest.Mock).mockReturnValue({} as Tile);
        (gridManagerService.teleportPlayer as jest.Mock).mockReturnValue(grid);
        expect(service.resetLoserPlayerPosition(player, grid)).toBe(grid);
    });

    it('should validate attacker', () => {
        const combatState: CombatState = {
            currentFighter: { name: 'Alice' } as Player,
        } as CombatState;
        expect(service.isValidAttacker(combatState, 'Alice')).toBeTruthy();
        expect(service.isValidAttacker(combatState, 'Bob')).toBeFalsy();
    });

    it('should get correct defender', () => {
        const attacker = { name: 'Alice' } as Player;
        const defender = { name: 'Bob' } as Player;
        const combatState: CombatState = {
            currentFighter: attacker,
            attacker,
            defender,
        } as CombatState;
        expect(service.getDefender(combatState)).toBe(defender);
    });

    it('should extract dice values correctly', () => {
        expect((service as any).extractDiceValue('d6')).toBe(6);
        expect((service as any).extractDiceValue('d4')).toBe(4);
        expect((service as any).extractDiceValue('')).toBe(1);
    });

    it('should return the correct defender when currentFighter is the attacker', () => {
        const combatState = {
            currentFighter: { name: 'Attacker' } as Player,
            attacker: { name: 'Attacker' } as Player,
            defender: { name: 'Defender' } as Player,
        };
        expect(service.getDefender(combatState as unknown as CombatState)).toBe(combatState.attacker);
    });

    it('should return the correct defender when currentFighter is the defender', () => {
        const combatState = {
            currentFighter: { name: 'Defender' } as Player,
            attacker: { name: 'Attacker' } as Player,
            defender: { name: 'Defender' } as Player,
        };
        expect(service.getDefender(combatState as unknown as CombatState)).toBe(combatState.attacker);
    });
    describe('hasStopItem', () => {
        it('should return false when player inventory is undefined', () => {
            const player: Player = {} as Player;

            const result = service['hasStopItem'](player);
            expect(result).toBe(false);
        });

        it('should handle null item in inventory array', () => {
            const player: Player = {
                inventory: [null, { name: ItemName.Stop }, null],
            } as unknown as Player;
            const result = service['hasStopItem'](player);

            expect(result).toBe(true);
        });
    });

    describe('getRandomAttackScore', () => {
        it('should use D6 dice when player has Stop item', () => {
            const attacker: Player = {
                attack: {
                    value: 10,
                    bonusDice: DiceType.D4,
                },
                inventory: [{ name: ItemName.Stop }],
            } as unknown as Player;

            const grid: Tile[][] = [[]];
            const isDebugMode = true;

            jest.spyOn(service as any, 'extractDiceValue')
                .mockReturnValueOnce(6)
                .mockReturnValueOnce(4);

            jest.spyOn(service as any, 'hasStopItem').mockReturnValue(true);
            jest.spyOn(gridManagerService, 'findTileByPlayer').mockReturnValue(null);
            const result = service.getRandomAttackScore(attacker, isDebugMode, grid);

            expect(result).toBe(16);
            expect(service['extractDiceValue']).toHaveBeenCalledWith(DiceType.D6);
            expect(service['extractDiceValue']).not.toHaveBeenCalledWith(DiceType.D4);
            expect(service['hasStopItem']).toHaveBeenCalledWith(attacker);
        });
    });
    describe('getRandomDefenseScore', () => {
        it('should use D6 dice when player has Stop item', () => {
            // Arrange
            const defender: Player = {
                defense: {
                    value: 8,
                    bonusDice: DiceType.D4,
                },
                inventory: [{ name: ItemName.Stop }],
            } as unknown as Player;

            const grid: Tile[][] = [[]];
            const isDebugMode = true;

            jest.spyOn(service as any, 'extractDiceValue')
                .mockReturnValueOnce(6)
                .mockReturnValueOnce(4);

            jest.spyOn(service as any, 'hasStopItem').mockReturnValue(true);
            jest.spyOn(gridManagerService, 'findTileByPlayer').mockReturnValue(null);

            const result = service.getRandomDefenseScore(defender, isDebugMode, grid);

            expect(result).toBe(14);
            expect(service['extractDiceValue']).toHaveBeenCalledWith(DiceType.D6);
            expect(service['extractDiceValue']).not.toHaveBeenCalledWith(DiceType.D4);
            expect(service['hasStopItem']).toHaveBeenCalledWith(defender);
        });
    });
});
