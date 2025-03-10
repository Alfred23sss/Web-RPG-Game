/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item';
import { DiceType } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { BehaviorSubject } from 'rxjs';
import { PlayerInfoService } from './player-info.service';

const MAX_HP = 100;

describe('PlayerInfoService', () => {
    let service: PlayerInfoService;

    const MOCK_PLAYER: Player = {
        name: 'TestPlayer',
        avatar: 'avatar.png',
        vitality: 4,
        hp: { current: 6, max: 6 },
        speed: 4,
        attack: { value: 4, bonusDice: DiceType.D6 },
        defense: { value: 4, bonusDice: DiceType.D4 },
        movementPoints: 10,
        actionPoints: 10,
        inventory: [null, null],
        isAdmin: false,
        hasAbandoned: false,
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
        const initialPlayer: Player = {
            ...MOCK_PLAYER,
            hp: { current: MAX_HP, max: MAX_HP },
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

    it('should restore health to max when restoreHealth is called', () => {
        const injuredPlayer: Player = {
            ...MOCK_PLAYER,
            hp: { current: 20, max: MAX_HP },
        };

        service.initializePlayer(injuredPlayer);
        service.restoreHealth();

        const player = (service as any).playerState.value as Player;
        expect(player.hp.current).toEqual(MAX_HP);
    });
});
