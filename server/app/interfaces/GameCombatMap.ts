import { CombatState } from './CombatState';

export interface GameCombatMap {
    [accessCode: string]: CombatState;
}
