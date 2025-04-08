import { Game } from '@app/model/database/game';
import { Player } from '@app/model/database/player';
import { Turn } from './Turn';

export interface GameSession {
    game: Game;
    turn: Turn;
}

export interface Teams {
    redTeam: Player[];
    blueTeam: Player[];
}

export interface CTFGameSession extends GameSession {
    redTeam: Player[];
    blueTeam: Player[];
}
