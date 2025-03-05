import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';

export interface Lobby {
    isLocked: boolean;
    accessCode: string;
    game: Game | null;
    players: Player[];
}
