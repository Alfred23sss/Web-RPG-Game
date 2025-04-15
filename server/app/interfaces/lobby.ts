import { Player } from '@app/interfaces/player';
import { Game } from '@app/model/database/game';

export interface Lobby {
    isLocked: boolean;
    accessCode: string;
    game: Game | null;
    players: Player[];
    maxPlayers: number;
    waitingPlayers: WaitingPlayers[];
}

export interface WaitingPlayers {
    socketId: string;
    avatar: string;
}
