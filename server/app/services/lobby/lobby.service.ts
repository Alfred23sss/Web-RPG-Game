import { GameSizePlayerCount, GameSizeTileCount } from '@app/enums/enums';
import { Lobby, WaintingPlayers } from '@app/interfaces/Lobby';
import { Player } from '@app/interfaces/Player';
import { Game } from '@app/model/database/game';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LobbyService {
    private lobbies: Map<string, Lobby> = new Map<string, Lobby>();
    private playerSockets: Map<string, string> = new Map<string, string>();
    private playerRoomMap = new Map<string, string>();

    constructor(private readonly accessCodeService: AccessCodesService) {}

    createLobby(game: Game): string {
        const accessCode = this.accessCodeService.generateAccessCode();
        const maxPlayers =
            game.size === GameSizeTileCount.Small
                ? GameSizePlayerCount.Small
                : game.size === GameSizeTileCount.Medium
                ? GameSizePlayerCount.Medium
                : GameSizePlayerCount.Large;

        const lobby = { accessCode, game, players: [], isLocked: false, maxPlayers, waitingPlayers: [] };
        this.lobbies.set(accessCode, lobby);
        return accessCode;
    }

    getLobby(accessCode: string): Lobby | undefined {
        return this.lobbies.get(accessCode);
    }

    joinLobby(accessCode: string, player: Player): { success: boolean; reason?: string; assignedName?: string } {
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return { success: false, reason: 'Lobby not found' };

        player.name = this.generateUniqueName(lobby, player.name);

        lobby.players.push(player);

        if (lobby.players.length >= lobby.maxPlayers) {
            lobby.isLocked = true;
        }

        return { success: true, assignedName: player.name };
    }

    isNameTaken(lobby: Lobby, player: Player): boolean {
        return lobby.players.some((p) => p.name === player.name);
    }

    leaveLobby(accessCode: string, playerName: string, isGameStarted: boolean = false): boolean {
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return false;

        const isAdmin = lobby.players.some((p) => p.name === playerName && p.isAdmin);

        lobby.players = lobby.players.filter((p) => p.name !== playerName);
        if (lobby.players.length === 0 || (isAdmin && !isGameStarted)) {
            this.lobbies.delete(accessCode);
            this.accessCodeService.removeAccessCode(accessCode);
            return true;
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

    setPlayerSocket(playerName: string, socketId: string): void {
        this.playerSockets.set(playerName, socketId);
    }

    getPlayerSocket(playerName: string): string | undefined {
        return this.playerSockets.get(playerName);
    }

    removePlayerSocket(playerName: string): void {
        this.playerSockets.delete(playerName);
    }

    getWaitingAvatars(accessCode: string): WaintingPlayers[] {
        return this.getLobby(accessCode).waitingPlayers;
    }

    isAdminLeaving(accessCode: string, playerName: string): boolean {
        const lobby = this.lobbies.get(accessCode);
        if (!lobby) return false;

        return lobby.players.some((p) => p.name === playerName && p.isAdmin);
    }

    addPlayerToRoom(socketId: string, roomId: string) {
        this.playerRoomMap.set(socketId, roomId);
    }

    removePlayerFromRoom(socketId: string) {
        this.playerRoomMap.delete(socketId);
    }

    getRoomForPlayer(socketId: string): string | null {
        return this.playerRoomMap.get(socketId) || null;
    }

    getPlayerBySocketId(socketId: string): Player | undefined {
        const playerEntry = Array.from(this.playerSockets.entries()).find(([, sId]) => sId === socketId);
        if (!playerEntry) return undefined;
        Logger.log('Player isnt undefined');
        const playerName = playerEntry[0];
        const lobbyId = this.getRoomForPlayer(socketId);
        Logger.log('lobbyId', lobbyId);
        if (!lobbyId) return undefined;

        const lobby = this.getLobby(lobbyId);
        Logger.log('lobby', lobby);
        return lobby?.players.find((p) => p.name === playerName);
    }

    private generateUniqueName(lobby: Lobby, duplicatedName: string): string {
        const existingNames = lobby.players.map((player) => player.name.toLowerCase());

        if (!existingNames.includes(duplicatedName.toLowerCase())) {
            return duplicatedName;
        }

        let counter = 2;
        let uniqueName;

        do {
            uniqueName = `${duplicatedName}-${counter}`;
            counter++;
        } while (existingNames.includes(uniqueName.toLowerCase()));

        return uniqueName;
    }
}
