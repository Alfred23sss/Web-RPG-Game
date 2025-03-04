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
        this.lobbies.set(accessCode, { accessCode, game, players: [] });
        this.logger.log(`Created lobby ${accessCode} for game: ${game.name}`);
        this.logger.log(`All lobbies: ${JSON.stringify([...this.lobbies.keys()])}`);
        return accessCode;
    }

    getLobby(accessCode: string): Lobby | undefined {
        this.logger.log(`Fetching lobby for accessCode: ${accessCode}`);
        this.logger.log(`Current lobbies: ${JSON.stringify([...this.lobbies.keys()])}`);
        return this.lobbies.get(accessCode);
    }

    joinLobby(accessCode: string, player: Player): boolean {
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return false;
        // make sure player isnt already in lobby possibly?
        lobby.players.push(player);
        return true;
    }

    leaveLobby(accessCode: string, playerName: string) {
        const lobby = this.lobbies.get(accessCode);
        if (lobby) {
            lobby.players = lobby.players.filter((p) => p.name !== playerName);
            if (lobby.players.length === 0) {
                this.lobbies.delete(accessCode);
                this.accessCodeService.removeAccessCode(accessCode);
            }
        }
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

    getUnavailableNamesAndAvatars(accessCode: string): { names: string[]; avatars: string[] } {//AJOUT2!!!!!!!!!
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return { names: [], avatars: [] };
    
        return {
            names: lobby.players.map(player => player.name),
            avatars: lobby.players.map(player => player.avatar),
        };
    }
    

    updatePlayerSelection(accessCode: string, player: Player): boolean {//AJOUT2!!!!!!!!!
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return false;
    
        // Vérifier si le nom ou l'avatar est déjà pris
        if (lobby.players.some(p => p.name === player.name && p.name !== player.name)) return false;
        if (lobby.players.some(p => p.avatar === player.avatar && p.name !== player.name)) return false;
    
        // Mettre à jour le joueur
        const existingPlayer = lobby.players.find(p => p.name === player.name);
        if (existingPlayer) {
            existingPlayer.avatar = player.avatar;
        } else {
            lobby.players.push(player);
        }
    
        return true;
    }
    

    
    
}
