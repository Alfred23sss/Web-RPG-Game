/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item';
import { DiceType } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { PlayerInfoService } from '@app/services/player-info/player-info.service';
import { BehaviorSubject } from 'rxjs';

const MAX_HP = 100;

describe('PlayerInfoService', () => {
    let service: PlayerInfoService;
    const mockItem = new Item({
        id: '0',
        name: 'Lightning',
        imageSrc: 'lightning.png',
        imageSrcGrey: 'lightning-gray.png',
        itemCounter: 1,
        description: 'Test item',
    });

    const MOCK_PLAYER: Player = {
        name: 'TestPlayer',
        avatar: 'avatar.png',
        vitality: 4,
        hp: { current: 50, max: MAX_HP },
        speed: 4,
        attack: { value: 4, bonusDice: DiceType.D6 },
        defense: { value: 4, bonusDice: DiceType.D4 },
        movementPoints: 10,
        actionPoints: 10,
        inventory: [null, null],
        isAdmin: false,
    };

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PlayerInfoService);
        service.initializePlayer({ ...MOCK_PLAYER });
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize player state with correct values', () => {
        const initialPlayer: Player = {
            ...MOCK_PLAYER,
            hp: { current: MAX_HP, max: MAX_HP },
        };

        service.initializePlayer(initialPlayer);
        const playerState = (service as any).playerState as BehaviorSubject<Player>;
        expect(playerState.value).toEqual(initialPlayer);
    });

    it('should add item to first empty slot', () => {
        const success = service.addItemToInventory(mockItem);
        const player = (service as any).playerState.value as Player;
        expect(success).toBeTrue();
        expect(player.inventory).toEqual([mockItem, null]);
    });

    it('should add item to second slot when first is occupied', () => {
        service.addItemToInventory(mockItem);

        const success = service.addItemToInventory(mockItem);
        const player = (service as any).playerState.value;

        expect(success).toBeTrue();
        expect(player.inventory).toEqual([mockItem, mockItem]);
    });

    it('should not add item when inventory is full', () => {
        service.addItemToInventory(mockItem);
        service.addItemToInventory(mockItem);

        const success = service.addItemToInventory(mockItem);
        expect(success).toBeFalse();
    });

    it('should handle negative health updates correctly', () => {
        service.updateHealth(-60);
        const player = (service as any).playerState.value;
        expect(player.hp.current).toBe(0);
    });

    it('should clamp health to 0 when taking fatal damage', () => {
        service.updateHealth(-200);
        const player = (service as any).playerState.value;
        expect(player.hp.current).toBe(0);
    });

    it('should not exceed max health when healing', () => {
        service.updateHealth(100);
        const player = (service as any).playerState.value;
        expect(player.hp.current).toBe(MAX_HP);
    });

    it('should restore health to max when restoreHealth is called', () => {
        const injuredPlayer: Player = {
            ...MOCK_PLAYER,
            hp: { current: 20, max: MAX_HP },
        };
        service.initializePlayer(injuredPlayer);

        service.restoreHealth();
        const player = (service as any).playerState.value;
        expect(player.hp.current).toEqual(MAX_HP);
    });

    it('should properly update observable when making changes', (done) => {
        const testPlayer = { ...MOCK_PLAYER, name: 'ObservableTest' };
        service.initializePlayer(testPlayer);

        service.player$.subscribe((player) => {
            expect(player.name).toBe('ObservableTest');
            done();
        });
    });

    it('should handle partial healing correctly', () => {
        const injuredPlayer = { ...MOCK_PLAYER, hp: { current: 20, max: MAX_HP } };
        service.initializePlayer(injuredPlayer);

        service.updateHealth(30);
        const player = (service as any).playerState.value;
        expect(player.hp.current).toBe(50);
    });

    it('should return correct player snapshot', () => {
        const snapshot = service.getPlayerSnapshot();
        expect(snapshot).toEqual(jasmine.any(Object));
        expect(snapshot).toEqual(MOCK_PLAYER);
        expect(snapshot).not.toBe((service as any).playerState.value);
    });

    it('should handle multiple sequential updates correctly', () => {
        expect(service.getPlayerSnapshot().hp.current).toBe(50);

        service.updateHealth(-30);
        expect(service.getPlayerSnapshot().hp.current).toBe(20);

        service.updateHealth(25);
        expect(service.getPlayerSnapshot().hp.current).toBe(45);

        service.updateHealth(100);
        expect(service.getPlayerSnapshot().hp.current).toBe(MAX_HP);
    });

    it('should maintain inventory integrity after multiple operations', () => {
        service.addItemToInventory(mockItem);
        expect(service.getPlayerSnapshot().inventory).toEqual([mockItem, null]);

        service.addItemToInventory(mockItem);
        expect(service.getPlayerSnapshot().inventory).toEqual([mockItem, mockItem]);

        const success = service.addItemToInventory(mockItem);
        expect(success).toBeFalse();
        expect(service.getPlayerSnapshot().inventory).toEqual([mockItem, mockItem]);
    });
});
