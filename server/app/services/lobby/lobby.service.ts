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
        const maxPlayers = game.size === '10' ? 2 : game.size === '15' ? 4 : 6;
        this.lobbies.set(accessCode, { accessCode, game, players: [], isLocked: false, maxPlayers });
        return accessCode;
    }

    getLobby(accessCode: string): Lobby | undefined {
        return this.lobbies.get(accessCode);
    }

    // joinLobby(accessCode: string, player: Player): boolean {
    //     const lobby = this.lobbies.get(accessCode);
    //     if (!lobby) return false;
    //     // make sure player isnt already in lobby possibly?
    //     lobby.players.push(player);
    //     return true;
    // }

    joinLobby(accessCode: string, player: Player): boolean {
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return false;
        if (lobby.players.some(p => p.name === player.name || p.avatar === player.avatar)) {
            return false; // Refuse l'ajout si le nom ou l'avatar est déjà pris
        }

        if (lobby.players.length >= lobby.maxPlayers) {
            lobby.isLocked = true;
            return false;
        }

        lobby.players.push(player);

        if (lobby.players.length >= lobby.maxPlayers) {
            lobby.isLocked = true;
        }

        return true;
    }
    
    leaveLobby(accessCode: string, playerName: string): boolean {
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return false;

        lobby.players = lobby.players.filter((p) => p.name !== playerName);

        if (lobby.players.length === 0 || lobby.players.some((p) => p.name === playerName && p.isAdmin)) {
            this.lobbies.delete(accessCode);
            this.accessCodeService.removeAccessCode(accessCode);
            return true;
        }

        if (lobby.isLocked && lobby.players.length < lobby.maxPlayers) {
            lobby.isLocked = false;
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

    getUnavailableNamesAndAvatars(accessCode: string): { names: string[]; avatars: string[] } {
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) {
            return { names: [], avatars: [] };
        }
    
        const unavailableData = {
            names: lobby.players.map((player) => player.name),
            avatars: lobby.players.map((player) => player.avatar),
        };
    
        return unavailableData;
    }
    
}
