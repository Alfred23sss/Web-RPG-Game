import { Lobby } from '@app/interfaces/Lobby';
import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LobbyService {
    private lobbies: Map<string, Lobby> = new Map<string, Lobby>();

    constructor(
        private readonly accessCodeService: AccessCodesService,
        private readonly logger: Logger,
    ) {}

    createLobby(game: Game): string {
        const accessCode = this.accessCodeService.generateAccessCode();
        this.lobbies.set(accessCode, { accessCode, game, players: [], isLocked: false });
        return accessCode;
    }

    getLobby(accessCode: string): Lobby | undefined {
        return this.lobbies.get(accessCode);
    }

    joinLobby(accessCode: string, player: Player): boolean {
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return false;
        // make sure player isnt already in lobby possibly?
        lobby.players.push(player);
        return true;
    }

    leaveLobby(accessCode: string, playerName: string): boolean {
        const lobby = this.lobbies.get(accessCode);
        if (lobby) {
            const player = lobby.players.find((p) => p.name === playerName);
            lobby.players = lobby.players.filter((p) => p.name !== playerName);
            if (player.isAdmin) {
                this.lobbies.delete(accessCode);
                this.accessCodeService.removeAccessCode(accessCode);
                return true;
            }
        }
        return false;
    }

    getLobbyPlayers(accessCode: string): Player[] {
        return this.lobbies.get(accessCode)?.players || [];
    }

    clearLobby(lobbyId: string): void {
        this.lobbies.delete(lobbyId);
    }

    getLobbyIdByPlayer(playerName: string): string | undefined {
        for (const [accessCode, lobby] of this.lobbies) {
            if (lobby.players.some((player) => player.name === playerName)) {
                return accessCode;
            }
        }
        return undefined;
    }
}
