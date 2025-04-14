/* eslint-disable @typescript-eslint/no-magic-numbers */ // approved by education team, disabling magic numbers in tests
/* eslint-disable @typescript-eslint/no-explicit-any */ // To test private methods

import { TileType } from '@app/enums/enums';
import { CombatState } from '@app/interfaces/combat-state';
import { DiceType } from '@app/interfaces/dice';
import { Player } from '@app/model/database/player';
import { Tile } from '@app/model/database/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CombatHelperService } from './combat-helper.service';
import { ItemName } from '@common/enums';

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

    it('should determine combat order correctly if attacker has more speed than defender', () => {
        const player1 = { speed: 5 } as Player;
        const player2 = { speed: 3 } as Player;
        expect(service.determineCombatOrder(player1, player2)).toEqual([player1, player2]);
    });

    it('should determine combat order correctly if defender has more speed than attacker', () => {
        const player2 = { speed: 5 } as Player;
        const player1 = { speed: 3 } as Player;
        expect(service.determineCombatOrder(player1, player2)).toEqual([player2, player1]);
    });

    it('should return attacker first if speeds are equal', () => {
        const player1 = { speed: 5 } as Player;
        const player2 = { speed: 5 } as Player;
        expect(service.determineCombatOrder(player1, player2)).toEqual([player1, player2]);
    });

    it('should apply correct attack score without ice penalty', () => {
        const player = { attack: { value: 5, bonusDice: 'D6' } } as unknown as Player;
        (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(undefined);
        const result = service.getRandomAttackScore(player, false, [[]]);
        expect(result.score).toBeGreaterThanOrEqual(6);
    });

    it('should apply correct defense score without ice penalty', () => {
        const player = { defense: { value: 5, bonusDice: 'D6' } } as unknown as Player;
        (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(undefined);
        const result = service.getRandomDefenseScore(player, false, [[]]);
        expect(result.score).toBeGreaterThanOrEqual(6);
    });

    it('should return predictable values in debug mode', () => {
        const player = {
            attack: { value: 5, bonusDice: 'D6' },
            defense: { value: 5, bonusDice: 'D6' },
        } as unknown as Player;
        (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(undefined);
        const attackResult = service.getRandomAttackScore(player, true, [[]]);
        const defenseResult = service.getRandomDefenseScore(player, true, [[]]);
        expect(attackResult.score).toBe(11);
        expect(defenseResult.score).toBe(11);
    });

    it('should return correct defense score', () => {
        const defender = { defense: { value: 5, bonusDice: 'd6' } } as unknown as Player;
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        const result = service.getRandomDefenseScore(defender, false, []);
        expect(result.score).toBeGreaterThan(5);
        jest.spyOn(global.Math, 'random').mockRestore();
    });

    it('should return correct attack score', () => {
        const attacker = { attack: { value: 5, bonusDice: 'd6' } } as unknown as Player;
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        const result = service.getRandomAttackScore(attacker, false, []);
        expect(result.score).toBeGreaterThan(5);
        jest.spyOn(global.Math, 'random').mockRestore();
    });

    it('should apply ice penalty on attack and defense', () => {
        const player = {
            attack: { value: 5, bonusDice: 'd6' },
            defense: { value: 5, bonusDice: 'd6' },
        } as unknown as Player;
        const tile = { type: TileType.Ice } as Tile;
        (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(tile);
        const attackResult = service.getRandomAttackScore(player, false, [[]]);
        const defenseResult = service.getRandomDefenseScore(player, false, [[]]);
        expect(attackResult.score).toBeLessThanOrEqual(9);
        expect(defenseResult.score).toBeLessThanOrEqual(9);
    });

    it('should reset loser player position', () => {
        const player = {} as Player;
        const grid = [[{} as Tile]];
        (gridManagerService.findTileBySpawnPoint as jest.Mock).mockReturnValue({} as Tile);
        (gridManagerService.teleportPlayer as jest.Mock).mockReturnValue(grid);
        expect(service.resetLoserPlayerPosition(player, grid)).toBe(grid);
    });

    it('should validate attacker', () => {
        const combatState: CombatState = { currentFighter: { name: 'Alice' } as Player } as CombatState;
        expect(service.isValidAttacker(combatState, 'Alice')).toBeTruthy();
        expect(service.isValidAttacker(combatState, 'Bob')).toBeFalsy();
    });

    it('should get correct defender', () => {
        const attacker = { name: 'Alice' } as Player;
        const defender = { name: 'Bob' } as Player;
        const combatState: CombatState = { currentFighter: attacker, attacker, defender } as CombatState;
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
        expect(service.getDefender(combatState as CombatState)).toBe(combatState.attacker);
    });

    it('should return the correct defender when currentFighter is the defender', () => {
        const combatState = {
            currentFighter: { name: 'Defender' } as Player,
            attacker: { name: 'Attacker' } as Player,
            defender: { name: 'Defender' } as Player,
        };
        expect(service.getDefender(combatState as CombatState)).toBe(combatState.attacker);
    });

    describe('hasStopItem', () => {
        it('should return false when player inventory is undefined', () => {
            const player: Player = {} as Player;
            const result = service['hasStopItem'](player);
            expect(result).toBe(false);
        });

        it('should handle null item in inventory array', () => {
            const player: Player = { inventory: [null, { name: ItemName.Stop }, null] } as unknown as Player;
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

            jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
            jest.spyOn(service as any, 'extractDiceValue').mockReturnValue(6);
            jest.spyOn(service as any, 'hasStopItem').mockReturnValue(true);
            (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(null);

            const result = service.getRandomAttackScore(attacker, isDebugMode, grid);

            expect(result).toStrictEqual({ diceRolled: 3, score: 16 });
            expect((service as any).extractDiceValue).toHaveBeenCalledWith(DiceType.D6);
            expect((service as any).extractDiceValue).not.toHaveBeenCalledWith(DiceType.D4);
            expect((service as any).hasStopItem).toHaveBeenCalledWith(attacker);
            jest.spyOn(global.Math, 'random').mockRestore();
        });
    });

    describe('getRandomDefenseScore', () => {
        it('should use D6 dice when player has Stop item', () => {
            const defender: Player = {
                defense: {
                    value: 8,
                    bonusDice: DiceType.D4,
                },
                inventory: [{ name: ItemName.Stop }],
            } as unknown as Player;

            const grid: Tile[][] = [[]];
            const isDebugMode = true;

            jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
            jest.spyOn(service as any, 'extractDiceValue').mockReturnValue(6);
            jest.spyOn(service as any, 'hasStopItem').mockReturnValue(true);
            (gridManagerService.findTileByPlayer as jest.Mock).mockReturnValue(null);

            const result = service.getRandomDefenseScore(defender, isDebugMode, grid);
            expect(result).toStrictEqual({ diceRolled: 3, score: 14 });
            expect((service as any).extractDiceValue).toHaveBeenCalledWith(DiceType.D6);
            expect((service as any).extractDiceValue).not.toHaveBeenCalledWith(DiceType.D4);
            expect((service as any).hasStopItem).toHaveBeenCalledWith(defender);
            jest.spyOn(global.Math, 'random').mockRestore();
        });
    });
});
