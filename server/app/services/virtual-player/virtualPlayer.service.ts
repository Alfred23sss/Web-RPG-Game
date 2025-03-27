import { DEFAULT_VIRTUAL_PLAYER, VIRTUAL_PLAYER_NAMES } from '@app/constants/constants';
import { AvatarType, Behavior } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/Lobby';
import { Player } from '@app/model/database/player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VirtualPlayerService {
    // TEST TOUT LES EDGECASES LIVE TIME AVATAR SELECTION!!!!
    constructor(private readonly lobbyService: LobbyService) {}

    createVirtualPlayer(behavior: Behavior, lobby: Lobby): void {
        const vPlayer = { ...DEFAULT_VIRTUAL_PLAYER };
        vPlayer.behavior = behavior;
        vPlayer.name = this.findValidName(lobby, vPlayer);
        vPlayer.avatar = this.findValidAvatar(lobby);

        // TODO : Salma : ajouter le resultat de assignBonusStatsRandomly au stats touche
        // call this.updateVirtualPlayerStats(vPlayer);

        this.addVPlayerToLobby(lobby, vPlayer);
    }

    kickVirtualPlayer(lobby: Lobby, player: Player): void {
        lobby.players = lobby.players.filter((p) => p.name !== player.name);
    }

    getUsedAvatars(lobby: Lobby): string[] {
        return [...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)];
    }

    private addVPlayerToLobby(lobby: Lobby, vPlayer: Player): void {
        if (lobby.isLocked) return;
        lobby.players.push(vPlayer);
        if (lobby.players.length >= lobby.maxPlayers) {
            lobby.isLocked = true;
        }
    }

    // TODO : Salma : Assigner de facon aléatoire les bonus de vitalité, vie, etc, et les dés.
    private randomizeBonusStats(): void {
        return;
    }

    // TODO : Salma : fonction qui update les attributs necessaire selon les Bonus stats choisi de randomizeBonusStats
    // private updateVirtualPlayerStats(vPlayer: Player): void {}

    private findValidAvatar(lobby: Lobby) {
        const usedAvatars = new Set([...lobby.players.map((p) => p.avatar), ...lobby.waitingPlayers.map((wp) => wp.avatar)]);
        let randomAvatar: string;
        do {
            randomAvatar = this.findRandomAvatar();
        } while (usedAvatars.has(randomAvatar));

        return randomAvatar;
    }

    private findRandomAvatar() {
        const avatars = Object.values(AvatarType);
        return avatars[Math.floor(Math.random() * avatars.length)];
    }

    private findValidName(lobby: Lobby, vPlayer: Player): string {
        let randomName: string;

        do {
            randomName = this.findRandomName();
        } while (this.lobbyService.isNameTaken(lobby, { ...vPlayer, name: randomName }));

        return randomName;
    }

    private findRandomName(): string {
        return VIRTUAL_PLAYER_NAMES[Math.floor(Math.random() * VIRTUAL_PLAYER_NAMES.length)];
    }
}
