import { TestBed } from '@angular/core/testing';
import { PlayerInfoService } from './player-info.service';
import { PlayerInfo } from '@app/interfaces/player';
import { Item } from '@app/classes/item';
import { BehaviorSubject } from 'rxjs';
import { DiceType } from '@app/enums/global.enums';

const MAX_HP = 100;

describe('PlayerInfoService', () => {
    let service: PlayerInfoService;

    const MOCK_PLAYER: PlayerInfo = {
        name: 'TestPlayer',
        avatar: 'avatar.png',
        hp: { current: 6, max: 6 },
        speed: 4,
        attack: { value: 4, bonusDice: DiceType.D6 },
        defense: { value: 4, bonusDice: DiceType.D4 },
        movementPoints: 10,
        actionPoints: 10,
        inventory: [null, null],
    };

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
});
