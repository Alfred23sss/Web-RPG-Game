import { Item } from '@app/classes/item';
import { DiceType } from '@app/enums/global.enums';
import { PlayerInfoService } from '@app/services/player-info/player-info.service';

export interface Player {
    playerInfoService: PlayerInfoService;
}

export interface PlayerInfo {
    name: string;
    avatar: string;
    hp: { current: number; max: number };
    speed: number;
    attack: { value: number; bonusDice: DiceType };
    defense: { value: number; bonusDice: DiceType };
    movementPoints: number;
    actionPoints: number;
    inventory: [Item | null, Item | null];
    turnTime?: number;
    escapeAttempts?: number;
}
