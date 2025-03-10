import { Game } from '@app/model/database/game';
import { Turn } from './Turn';

export interface GameSession {
    game: Game;
    turn: Turn;
}
