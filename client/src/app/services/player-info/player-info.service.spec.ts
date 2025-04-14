/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-shadow*/
/* eslint-disable @typescript-eslint/no-magic-numbers*/
import { TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item/item';
import { MOCK_PLAYER } from '@app/constants/global.constants';
import { Player } from '@app/interfaces/player';
import { BehaviorSubject } from 'rxjs';
import { PlayerInfoService } from './player-info.service';

const MAX_HP_TEST = 100;

describe('PlayerInfoService', () => {
    let service: PlayerInfoService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PlayerInfoService);
        MOCK_PLAYER.inventory = [null, null];
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize player state with correct values', () => {
        const initialPlayer: Player = {
            ...MOCK_PLAYER,
            hp: { current: MAX_HP_TEST, max: MAX_HP_TEST },
        };

        service.initializePlayer(initialPlayer);

        const playerState = (service as any).playerState as BehaviorSubject<Player>;
        const player = playerState.value;

        expect(player).toEqual(initialPlayer);
    });

    const mockItem = new Item({
        id: '0',
        name: 'Lightning',
        imageSrc: 'lightning.png',
        imageSrcGrey: 'lightning-gray.png',
        itemCounter: 1,
        description: 'Test item',
    });

    it('should add item to first empty slot', () => {
        service.initializePlayer(MOCK_PLAYER);
        const success = service.addItemToInventory(mockItem);

        const player = (service as any).playerState.value as Player;
        expect(success).toBeTrue();
        expect(player.inventory).toEqual([mockItem, null]);
    });

    it('should not add item if no empty slot', () => {
        MOCK_PLAYER.inventory = [{} as Item, {} as Item];
        service.initializePlayer(MOCK_PLAYER);
        const success = service.addItemToInventory(mockItem);

        expect(success).toBeFalse();
    });

    it('should restore health to max when restoreHealth is called', () => {
        const injuredPlayer: Player = {
            ...MOCK_PLAYER,
            hp: { current: 20, max: MAX_HP_TEST },
        };

        service.initializePlayer(injuredPlayer);
        service.restoreHealth();

        const player = (service as any).playerState.value as Player;
        expect(player.hp.current).toEqual(MAX_HP_TEST);
    });

    describe('updateHealth()', () => {
        it('should increase current HP when positive healthVariation is applied', () => {
            const initialHp = 50;
            const player = { ...MOCK_PLAYER, hp: { current: initialHp, max: MAX_HP_TEST } };
            service.initializePlayer(player);

            service.updateHealth(30);

            expect(service.getPlayerSnapshot().hp.current).toBe(80);
        });

        it('should decrease current HP when negative healthVariation is applied', () => {
            const initialHp = 70;
            const player = { ...MOCK_PLAYER, hp: { current: initialHp, max: MAX_HP_TEST } };
            service.initializePlayer(player);

            service.updateHealth(-20);

            expect(service.getPlayerSnapshot().hp.current).toBe(50);
        });

        it('should clamp to max HP when health increase exceeds maximum', () => {
            const initialHp = 95;
            const player = { ...MOCK_PLAYER, hp: { current: initialHp, max: MAX_HP_TEST } };
            service.initializePlayer(player);

            service.updateHealth(10);

            expect(service.getPlayerSnapshot().hp.current).toBe(MAX_HP_TEST);
        });

        it('should clamp to 0 when health decrease exceeds current HP', () => {
            const initialHp = 25;
            const player = { ...MOCK_PLAYER, hp: { current: initialHp, max: MAX_HP_TEST } };
            service.initializePlayer(player);

            service.updateHealth(-30);

            expect(service.getPlayerSnapshot().hp.current).toBe(0);
        });

        it('should handle exact maximum boundary', () => {
            const initialHp = 90;
            const player = { ...MOCK_PLAYER, hp: { current: initialHp, max: MAX_HP_TEST } };
            service.initializePlayer(player);

            service.updateHealth(10);

            expect(service.getPlayerSnapshot().hp.current).toBe(MAX_HP_TEST);
        });

        it('should handle exact zero boundary', () => {
            const initialHp = 30;
            const player = { ...MOCK_PLAYER, hp: { current: initialHp, max: MAX_HP_TEST } };
            service.initializePlayer(player);

            service.updateHealth(-30);

            expect(service.getPlayerSnapshot().hp.current).toBe(0);
        });

        it('should not modify max HP value', () => {
            const player = { ...MOCK_PLAYER, hp: { current: 50, max: MAX_HP_TEST } };
            service.initializePlayer(player);

            service.updateHealth(20);

            expect(service.getPlayerSnapshot().hp.max).toBe(MAX_HP_TEST);
        });

        it('should preserve other player properties', () => {
            const player = {
                ...MOCK_PLAYER,
                hp: { current: 50, max: MAX_HP_TEST },
                inventory: [mockItem, null],
            } as Player;
            service.initializePlayer(player);
            const originalPlayer = service.getPlayerSnapshot();

            service.updateHealth(25);
            const updatedPlayer = service.getPlayerSnapshot();

            expect(updatedPlayer.hp.current).toBe(75);
            expect(updatedPlayer.inventory).toEqual(originalPlayer.inventory);
            expect(updatedPlayer.name).toBe(originalPlayer.name);
            expect(updatedPlayer.speed).toBe(originalPlayer.speed);
        });
    });
});
