import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';

export interface Lobby {
    accessCode: string;
    game: Game;
    players: Player[];
}
