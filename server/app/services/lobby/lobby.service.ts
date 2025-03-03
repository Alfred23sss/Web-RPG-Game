import { Player } from '@app/model/player/player.model';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LobbyService {
    private lobbies: Map<string, Player[]> = new Map<string, Player[]>();

    createLobby(lobbyId: string): void {
        if (!this.lobbies.has(lobbyId)) {
            this.lobbies.set(lobbyId, []);
        }
    }

    joinLobby(lobbyId: string, player: Player): boolean {
        if (!this.lobbies.has(lobbyId)) return false;

        const players = this.lobbies.get(lobbyId);

        if (players.some((p) => p.name === player.name)) return false;

        players.push(player);
        return true;
    }

    leaveLobby(lobbyId: string, playerName: string): void {
        const players = this.lobbies.get(lobbyId);

        if (!players) return;

        this.lobbies.set(
            lobbyId,
            players.filter((player) => player.name !== playerName),
        );
        if (this.lobbies.get(lobbyId)?.length === 0) {
            this.lobbies.delete(lobbyId);
        }
    }

    getLobbyPlayers(lobbyId: string): Player[] {
        return this.lobbies.get(lobbyId) || [];
    }

    clearLobby(lobbyId: string): void {
        this.lobbies.delete(lobbyId);
    }

    getLobbies(): Map<string, Player[]> {
        return this.lobbies;
    }

    getLobbyIdByPlayer(playerName: string): string | null {
        for (const [lobbyId, players] of this.lobbies.entries()) {
            if (players.some((player) => player.name === playerName)) {
                return lobbyId;
            }
        }
        return null;
    }
}
