import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';

export interface Lobby {
    isLocked: boolean;
    accessCode: string;
    game: Game | null;
    players: Player[];
    maxPlayers: number;
}
