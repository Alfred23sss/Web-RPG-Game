import { CombatState } from './combat-state';

export interface GameCombatMap {
    [accessCode: string]: CombatState;
}
