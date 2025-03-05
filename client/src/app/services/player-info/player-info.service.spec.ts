import { TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item';
import { DiceType } from '@app/enums/global.enums';
import { PlayerInfo } from '@app/interfaces/player';
import { BehaviorSubject } from 'rxjs';
import { PlayerInfoService } from './player-info.service';

const MAX_HP = 100;
const DAMAGE = -10;
const BAD_INDEX = 5;

const INJURED_PLAYER: PlayerInfo = {
    name: 'TestPlayer',
    avatar: 'avatar.png',
    hp: { current: 20, max: MAX_HP },
    speed: 4,
    attack: { value: 4, bonusDice: DiceType.D6 },
    defense: { value: 4, bonusDice: DiceType.D4 },
    movementPoints: 10,
    actionPoints: 10,
    inventory: [null, null],
};

const MOCK_PLAYER: PlayerInfo = {
    name: 'TestPlayer',
    avatar: 'avatar.png',
    hp: { current: 100, max: MAX_HP },
    speed: 4,
    attack: { value: 4, bonusDice: DiceType.D6 },
    defense: { value: 4, bonusDice: DiceType.D4 },
    movementPoints: 10,
    actionPoints: 10,
    inventory: [null, null],
};

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
        const initialPlayer: PlayerInfo = {
            name: 'TestPlayer',
            avatar: 'avatar.png',
            hp: { current: MAX_HP, max: MAX_HP },
            speed: 4,
            attack: { value: 4, bonusDice: DiceType.D6 },
            defense: { value: 4, bonusDice: DiceType.D4 },
            movementPoints: 10,
            actionPoints: 10,
            inventory: [null, null],
        };

        service.initializePlayer(initialPlayer);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const playerState = (service as any).playerState as BehaviorSubject<PlayerInfo>;
        const player = playerState.value;

        expect(player).toBeTruthy();
        expect(player?.name).toBe('TestPlayer');
        expect(player?.avatar).toBe('avatar.png');
        expect(player?.hp.current).toBe(MAX_HP);
        expect(player?.hp.max).toBe(MAX_HP);
        expect(player?.inventory).toEqual([null, null]);
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const player = (service as any).playerState.value as PlayerInfo;
        expect(success).toBeTrue();
        expect(player.inventory).toEqual([mockItem, null]);
    });

    it('should add item to second slot if first is occupied', () => {
        service.initializePlayer(MOCK_PLAYER);

        service.addItemToInventory(mockItem);
        const success = service.addItemToInventory(mockItem);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const player = (service as any).playerState.value as PlayerInfo;
        expect(success).toBeTrue();
        expect(player.inventory).toEqual([mockItem, mockItem]);
    });

    it('should return false if inventory is full', () => {
        service.initializePlayer(MOCK_PLAYER);

        service.addItemToInventory(mockItem);
        service.addItemToInventory(mockItem);

        expect(service.addItemToInventory(mockItem)).toBeFalse();
    });

    it('should restore health to max when restoreHealth is called', () => {
        service.initializePlayer(INJURED_PLAYER);
        service.restoreHealth();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const player = (service as any).playerState.value as PlayerInfo;
        expect(player.hp.current).toEqual(MAX_HP);
    });

    it('should update health when taking damage', () => {
        service.initializePlayer(MOCK_PLAYER);
        service.updateHealth(DAMAGE);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const player = (service as any).playerState.value as PlayerInfo;

        expect(player.hp.current).toEqual(player.hp.max + DAMAGE);
    });

    it('should return early and not update state when clampedHealth equals 0', () => {
        service.initializePlayer(INJURED_PLAYER);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const playerState = (service as any).playerState as BehaviorSubject<PlayerInfo>;
        const nextSpy = spyOn(playerState, 'next').and.callThrough();

        service.updateHealth(-MAX_HP);

        expect(nextSpy).not.toHaveBeenCalled();
    });

    it('should return [null, null] when the inventory is empty', () => {
        service.initializePlayer(MOCK_PLAYER);
        const inventory = service.getInventory();

        expect(inventory).toEqual([null, null]);
    });

    it('should return  when the inventory is empty', () => {
        service.initializePlayer(MOCK_PLAYER);
        const inventory = service.getInventory();

        expect(inventory).toEqual([null, null]);
    });

    it('should return a deep clone of the player state', () => {
        service.initializePlayer(MOCK_PLAYER);
        const clone = service.getPlayerInfo();

        expect(clone).toEqual(MOCK_PLAYER);

        clone.hp.current = 0;
        const newClone = service.getPlayerInfo();

        expect(newClone.hp.current).toEqual(MAX_HP);
    });

    it('should remove item from inventory correctly when given a valid index', () => {
        service.initializePlayer(MOCK_PLAYER);
        const addSuccess = service.addItemToInventory(mockItem);
        expect(addSuccess).toBeTrue();

        const removed = service.removeItemFromInventory(0);
        expect(removed).toBeTrue();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const player = (service as any).playerState.value as PlayerInfo;
        expect(player.inventory[0]).toBeNull();
    });

    it('should return false when an invalid index is provided', () => {
        service.initializePlayer(MOCK_PLAYER);
        expect(service.removeItemFromInventory(-1)).toBeFalse();
        expect(service.removeItemFromInventory(BAD_INDEX)).toBeFalse();
    });
});
