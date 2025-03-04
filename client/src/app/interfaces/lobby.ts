import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';

export interface Lobby {
    accessCode: string;
    game: Game;
    players: Player[];
}
