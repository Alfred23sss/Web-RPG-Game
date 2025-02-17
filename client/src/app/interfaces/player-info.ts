export interface PlayerInfo {
    name: string;
    avatar: string;
    hp: { current: number; max: number };
    speed: number;
    attack: { value: number; bonusDie: 'D4' | 'D6' };
    defense: { value: number; bonusDie: 'D4' | 'D6' };
    movementPoints: number;
    actionPoints: number;
}
