/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { CombatManagerService } from './combat-manager.service';
import { Player } from '@app/interfaces/player';

const MOCK_PLAYER_1 = {
    playerInfoService: {
        getPlayerInfo: jasmine.createSpy('getPlayerInfo').and.returnValue({
            speed: 10,
            attack: { value: 4, bonusDice: 'D6' },
            defense: { value: 4, bonusDice: 'D4' },
            name: 'Player1',
            hp: { current: 100, max: 100 },
        }),
        updateHealth: jasmine.createSpy('updateHealth'),
        restoreHealth: jasmine.createSpy('restoreHealth'),
    },
} as unknown as Player;

const MOCK_PLAYER_2 = {
    playerInfoService: {
        getPlayerInfo: jasmine.createSpy('getPlayerInfo').and.returnValue({
            speed: 5,
            attack: { value: 4, bonusDice: 'D4' },
            defense: { value: 4, bonusDice: 'D6' },
            name: 'Player2',
            hp: { current: 100, max: 100 },
        }),
        updateHealth: jasmine.createSpy('updateHealth'),
        restoreHealth: jasmine.createSpy('restoreHealth'),
    },
} as unknown as Player;

const MOCK_PLAYER_3 = {
    playerInfoService: {
        getPlayerInfo: jasmine.createSpy('getPlayerInfo').and.returnValue({
            speed: 15,
            attack: { value: 4, bonusDice: 'D6' },
            defense: { value: 4, bonusDice: 'D4' },
            name: 'Player3',
            hp: { current: 100, max: 100 },
        }),
        updateHealth: jasmine.createSpy('updateHealth'),
        restoreHealth: jasmine.createSpy('restoreHealth'),
    },
} as unknown as Player;

describe('CombatManagerService', () => {
    let service: CombatManagerService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CombatManagerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should start combat with the correct initial state when MOCK_PLAYER_1 has higher speed', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        const cs = (service as any).combatState; // any because combatState is private

        expect(cs.player1).toBe(MOCK_PLAYER_1);
        expect(cs.player2).toBe(MOCK_PLAYER_2);
        expect(cs.currentPlayer).toBe(MOCK_PLAYER_1);
        expect(cs.isCombatActive).toBeTrue();
        expect(cs.player1Attributes.turnTime).toEqual(5);
        expect(cs.player1Attributes.escapeAttempts).toEqual(2);
        expect(cs.player2Attributes.turnTime).toEqual(5);
        expect(cs.player2Attributes.escapeAttempts).toEqual(2);
    });

    it('should set currentPlayer to player2 when player2 has higher speed than player1 (line 36 branch)', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_3);
        const cs = (service as any).combatState; // any because combatState is private
        expect(cs.currentPlayer).toBe(MOCK_PLAYER_3);
    });

    it('should handle attack correctly when currentPlayer is MOCK_PLAYER_1 (line 44 branch option 1)', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        spyOn(service as any, 'rollDice').and.returnValue(2); // any because rollDice is private
        service.handleAttack();
        expect(MOCK_PLAYER_1.playerInfoService.updateHealth).toHaveBeenCalledWith(-0);
        const cs = (service as any).combatState; // any because combatState is private
        expect(cs.currentPlayer).toBe(MOCK_PLAYER_2);
    });

    it('should handle attack correctly when currentPlayer is MOCK_PLAYER_2', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        (service as any).combatState.currentPlayer = MOCK_PLAYER_2; // any because combatState is private
        spyOn(service as any, 'rollDice').and.returnValue(1); // any because rollDice is private
        service.handleAttack();
        expect(MOCK_PLAYER_2.playerInfoService.updateHealth).toHaveBeenCalledWith(-0);
        const cs = (service as any).combatState; // any because combatState is private
        expect(cs.currentPlayer).toBe(MOCK_PLAYER_1);
    });

    it('should switch turn correctly when currentPlayer is MOCK_PLAYER_1', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        (service as any).combatState.currentPlayer = MOCK_PLAYER_1; // any because combatState is private
        (service as any).switchTurn(); // any because switchTurn is private
        expect((service as any).combatState.currentPlayer).toBe(MOCK_PLAYER_2); // any because combatState is private
    });

    it('should switch turn correctly when currentPlayer is MOCK_PLAYER_2 (line 81 branch option 2)', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        (service as any).combatState.currentPlayer = MOCK_PLAYER_2; // any because combatState is private
        (service as any).switchTurn(); // any because switchTurn is private
        expect((service as any).combatState.currentPlayer).toBe(MOCK_PLAYER_1); // any because combatState is private
    });

    // --- Tests for line 85 (ternary in getCurrentAttributes) ---
    it('should return player1Attributes when currentPlayer is MOCK_PLAYER_1 (line 85 branch option 1)', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        (service as any).combatState.currentPlayer = MOCK_PLAYER_1;
        const attributes = (service as any).getCurrentAttributes(); // any because getCurrentAttributes is private
        expect(attributes).toBe((service as any).combatState.player1Attributes); // any because combatState is private
    });

    it('should return player2Attributes when currentPlayer is MOCK_PLAYER_2 (line 85 branch option 2)', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        (service as any).combatState.currentPlayer = MOCK_PLAYER_2;
        const attributes = (service as any).getCurrentAttributes(); // any because getCurrentAttributes is private
        expect(attributes).toBe((service as any).combatState.player2Attributes); // any because combatState is private
    });

    it('should handle successful evasion correctly', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        spyOn(Math, 'random').and.returnValue(0.2);
        service.handleEvasion();
        expect(MOCK_PLAYER_1.playerInfoService.restoreHealth).toHaveBeenCalled();
        expect(MOCK_PLAYER_2.playerInfoService.restoreHealth).toHaveBeenCalled();
        const cs = (service as any).combatState; // any because combatState is private
        expect(cs.isCombatActive).toBeFalse();
    });

    it('should handle failed evasion correctly and switch turn', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        spyOn(Math, 'random').and.returnValue(0.5);
        const cs = (service as any).combatState; // any because combatState is private
        const initialEscapes = cs.player1Attributes.escapeAttempts;
        service.handleEvasion();
        expect(cs.player1Attributes.escapeAttempts).toEqual(initialEscapes - 1);
        expect(cs.currentPlayer).toBe(MOCK_PLAYER_2);
    });

    it('should set turnTime to NO_ESCAPES_TIMER when escapeAttempts reach 0 after evasion', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        const cs = (service as any).combatState; // any because combatState is private
        spyOn(Math, 'random').and.returnValue(0.5);
        cs.player1Attributes.escapeAttempts = 1;
        service.handleEvasion();
        expect(cs.player1Attributes.escapeAttempts).toEqual(0);
        expect(cs.player1Attributes.turnTime).toEqual(3);
    });

    it('should roll dice correctly for bonusDice "D6"', () => {
        spyOn(Math, 'random').and.returnValue(0.5);
        const result = (service as any).rollDice('D6'); // any because rollDice is private
        expect(result).toEqual(3);
    });

    it('should return early in handleEvasion when escapeAttempts are 0', () => {
        service.startCombat(MOCK_PLAYER_1, MOCK_PLAYER_2);
        const cs = (service as any).combatState; // any because combatState is private

        cs.player1Attributes.escapeAttempts = 0;
        spyOn(service as any, 'switchTurn'); // any because switchTurn is private

        service.handleEvasion();

        expect((service as any).switchTurn).not.toHaveBeenCalled();
        expect(cs.currentPlayer).toBe(MOCK_PLAYER_1);
        expect(cs.isCombatActive).toBeTrue();
    });
});
