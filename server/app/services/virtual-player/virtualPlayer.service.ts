import { DEFAULT_VIRTUAL_PLAYER, VIRTUAL_PLAYER_NAMES } from '@app/constants/constants';
import { AvatarType, Behavior } from '@app/enums/enums';
import { DiceType } from '@app/interfaces/Dice';
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

        this.updateVirtualPlayerStats(vPlayer);
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

    private randomizeSpeedAndVitality(): { speed: number; vitality: number; hp: { current: number; max: number } } {
        const values = [4, 6];
        const speedIndex = Math.floor(Math.random() * 2);
        const vitalityIndex = 1 - speedIndex;
        const vitality = values[vitalityIndex];
        return { speed: values[speedIndex], vitality, hp: { current: vitality, max: vitality } };
    }

    private randomizeAttackAndDefense(): { attack: { value: number; bonusDice: DiceType }; defense: { value: number; bonusDice: DiceType } } {
        const dicePairs: [DiceType, DiceType][] = [
            [DiceType.D4, DiceType.D6],
            [DiceType.D6, DiceType.D4],
        ];
        const [attackDice, defenseDice] = dicePairs[Math.floor(Math.random() * 2)];
        return {
            attack: {
                value: 4,
                bonusDice: attackDice,
            },
            defense: {
                value: 4,
                bonusDice: defenseDice,
            },
        };
    }

    private updateVirtualPlayerStats(vPlayer: Player): void {
        const { speed, vitality, hp } = this.randomizeSpeedAndVitality();
        const { attack, defense } = this.randomizeAttackAndDefense();
        vPlayer.speed = speed;
        vPlayer.vitality = vitality;
        vPlayer.hp = hp;
        vPlayer.attack = attack;
        vPlayer.defense = defense;
    }

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
