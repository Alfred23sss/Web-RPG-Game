import { Game } from '@app/interfaces/game';

export interface CharacterDialogData {
    game: Game;
    accessCode: string;
    isLobbyCreated: boolean;
}
