import { TestBed } from '@angular/core/testing';
import { PlayerInfoService } from './player-info.service';
import { PlayerInfo } from '@app/interfaces/player';
import { Item } from '@app/classes/item';
import { BehaviorSubject } from 'rxjs';
import { DiceType } from '@app/enums/global.enums';

describe('PlayerInfoService', () => {
    let service: PlayerInfoService;

    const MOCK_PLAYER: PlayerInfo = {
        name: 'TestPlayer',
        avatar: 'avatar.png',
        hp: { current: 100, max: 100 },
        speed: 5,
        attack: { value: 10, bonusDie: DiceType.D6 },
        defense: { value: 8, bonusDie: DiceType.D4 },
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
            hp: { current: 100, max: 100 },
            speed: 5,
            attack: { value: 10, bonusDie: DiceType.D6 },
            defense: { value: 8, bonusDie: DiceType.D4 },
            movementPoints: 10,
            actionPoints: 10,
            inventory: [null, null],
        };

        service.initializePlayer(initialPlayer);

        // Access the private playerState using a type assertion.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const playerState = (service as any).playerState as BehaviorSubject<PlayerInfo | null>;
        const player = playerState.value;

        expect(player).toBeTruthy();
        expect(player?.name).toBe('TestPlayer');
        expect(player?.avatar).toBe('avatar.png');
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        expect(player?.hp.current).toBe(100);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        expect(player?.hp.max).toBe(100);
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

        // Fill first slot.
        service.addItemToInventory(mockItem);
        // Add second item.
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

    it('should return false if player is not initialized', () => {
        // Set the player state to null.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).playerState.next(null);
        const success = service.addItemToInventory(mockItem);
        expect(success).toBeFalse();
    });
});
