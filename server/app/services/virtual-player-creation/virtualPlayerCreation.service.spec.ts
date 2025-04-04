/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { BASE_STAT, BONUS_STAT, VIRTUAL_PLAYER_NAMES } from '@app/constants/constants';
import { AvatarType, Behavior } from '@app/enums/enums';
import { DiceType } from '@app/interfaces/Dice';
import { Lobby } from '@app/interfaces/Lobby';
import { Player } from '@app/interfaces/Player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerCreationService } from './virtualPlayerCreation.service';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerCreationService;

    const mockLobbyService = {
        isNameTaken: jest.fn().mockReturnValue(false),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [VirtualPlayerCreationService, { provide: LobbyService, useValue: mockLobbyService }],
        }).compile();

        service = module.get<VirtualPlayerCreationService>(VirtualPlayerCreationService);
    });

    describe('randomizeSpeedAndVitality', () => {
        it('should return speed and vitality with different values (4 or 6)', () => {
            for (let i = 0; i < 20; i++) {
                const result = (service as any).randomizeSpeedAndVitality();
                expect([BASE_STAT, BONUS_STAT]).toContain(result.speed);
                expect([BASE_STAT, BONUS_STAT]).toContain(result.vitality);
                expect(result.speed).not.toBe(result.vitality);
                expect(result.hp.current).toBe(result.vitality);
                expect(result.hp.max).toBe(result.vitality);
            }
        });
    });

    describe('randomizeAttackAndDefense', () => {
        it('should return different dice types and base values for attack and defense', () => {
            for (let i = 0; i < 20; i++) {
                const result = (service as any).randomizeAttackAndDefense();
                expect(result.attack.value).toBe(BASE_STAT);
                expect(result.defense.value).toBe(BASE_STAT);
                expect(result.attack.bonusDice).not.toBe(result.defense.bonusDice);
                expect([DiceType.D4, DiceType.D6]).toContain(result.attack.bonusDice);
                expect([DiceType.D4, DiceType.D6]).toContain(result.defense.bonusDice);
            }
        });
    });

    describe('createVirtualPlayer', () => {
        it('should create a virtual player with expected fields', () => {
            const lobby = {
                players: [],
                waitingPlayers: [],
                maxPlayers: 5,
                isLocked: false,
            };

            service.createVirtualPlayer(Behavior.Aggressive, lobby as any);

            const createdPlayer = lobby.players[0];

            expect(createdPlayer).toBeDefined();
            expect(createdPlayer.isVirtual).toBe(true);
            expect(createdPlayer.isAdmin).toBe(false);
            expect(createdPlayer.behavior).toBe(Behavior.Aggressive);
            expect(createdPlayer.name).toBeTruthy();
            expect(createdPlayer.avatar).toBeTruthy();
            expect(createdPlayer.attack.value).toBe(BASE_STAT);
            expect(createdPlayer.defense.value).toBe(BASE_STAT);
            expect(createdPlayer.attack.bonusDice).not.toBe(createdPlayer.defense.bonusDice);
            expect(createdPlayer.hp.current).toBe(createdPlayer.vitality);
            expect(createdPlayer.hp.max).toBe(createdPlayer.vitality);
            expect(createdPlayer.speed).not.toBe(createdPlayer.vitality);
        });
    });

    describe('kickVirtualPlayer', () => {
        it('should remove a virtual player from the lobby', () => {
            const playerToKick = { name: 'TestBot' } as Player;
            const lobby = {
                players: [playerToKick],
                waitingPlayers: [],
            } as Lobby;

            service.kickVirtualPlayer(lobby, playerToKick);
            expect(lobby.players.length).toBe(0);
        });
    });

    describe('findValidName', () => {
        it('should return a unique name not taken in the lobby', () => {
            mockLobbyService.isNameTaken.mockReturnValueOnce(true).mockReturnValue(false);

            const lobby = {
                players: [],
                waitingPlayers: [],
            } as Lobby;

            const name = (service as any).findValidName(lobby, { name: '' } as Player);
            expect(typeof name).toBe('string');
            expect(mockLobbyService.isNameTaken).toHaveBeenCalled();
        });
    });

    describe('findValidAvatar', () => {
        it('should return an unused avatar', () => {
            const allAvatars = Object.values(AvatarType);
            const usedAvatar = allAvatars[0];

            const lobby = {
                players: [{ avatar: usedAvatar } as Player],
                waitingPlayers: [],
            } as Lobby;

            const avatar = (service as any).findValidAvatar(lobby);
            expect(allAvatars).toContain(avatar);
            expect(avatar).not.toBe(usedAvatar);
        });
    });

    describe('findRandomName', () => {
        it('should return a valid name from the pool', () => {
            const name = (service as any).findRandomName();
            expect(name).toBeDefined();
            expect(VIRTUAL_PLAYER_NAMES).toContain(name);
        });
    });

    describe('findRandomAvatar', () => {
        it('should return a valid avatar from the enum', () => {
            const avatar = (service as any).findRandomAvatar();
            expect(Object.values(AvatarType)).toContain(avatar);
        });
    });

    describe('addVPlayerToLobby', () => {
        it('should add a player to the lobby if not locked', () => {
            const lobby = {
                players: [],
                maxPlayers: 3,
                isLocked: false,
            } as Lobby;

            const vPlayer = { name: 'Bot1' } as Player;

            (service as any).addVPlayerToLobby(lobby, vPlayer);
            expect(lobby.players).toContain(vPlayer);
        });

        it('should not add a player if the lobby is already locked', () => {
            const lobby = {
                players: [],
                maxPlayers: 3,
                isLocked: true,
            } as Lobby;

            const vPlayer = { name: 'Bot2' } as Player;

            (service as any).addVPlayerToLobby(lobby, vPlayer);
            expect(lobby.players).not.toContain(vPlayer);
        });

        it('should lock the lobby if number of players reaches maxPlayers', () => {
            const lobby = {
                players: [{}, {}, {}] as Player[],
                maxPlayers: 4,
                isLocked: false,
            } as Lobby;

            const vPlayer = { name: 'FinalBot' } as Player;

            (service as any).addVPlayerToLobby(lobby, vPlayer);

            expect(lobby.players.length).toBe(4);
            expect(lobby.isLocked).toBe(true);
        });
    });

    describe('getUsedAvatars', () => {
        it('should return avatars from players and waitingPlayers', () => {
            const lobby: Lobby = {
                players: [{ avatar: 'alfred' } as Player, { avatar: 'alfred-2' } as Player],
                waitingPlayers: [{ socketId: 'abc123', avatar: 'avatar3' }],
                accessCode: '1234',
                isLocked: false,
                maxPlayers: 4,
                game: null,
            };

            const avatars = service.getUsedAvatars(lobby);

            expect(avatars).toEqual(['alfred', 'alfred-2', 'avatar3']);
        });
    });

    it('should early return if lobby is locked (no push or lock)', () => {
        const lobby = {
            players: [{ name: 'Player1' }] as Player[],
            maxPlayers: 2,
            isLocked: true,
        } as Lobby;

        const vPlayer = { name: 'ShouldNotBeAdded' } as Player;

        (service as any).addVPlayerToLobby(lobby, vPlayer);

        expect(lobby.players.length).toBe(1); // n'a pas été ajouté
        expect(lobby.players.find((p) => p.name === 'ShouldNotBeAdded')).toBeUndefined();
    });

    describe('updateVirtualPlayerStats', () => {
        it('should update a player with randomized stats', () => {
            const player = {
                attack: { value: 0, bonusDice: DiceType.Uninitialized },
                defense: { value: 0, bonusDice: DiceType.Uninitialized },
                speed: 0,
                vitality: 0,
                hp: { current: 0, max: 0 },
            } as Player;

            (service as any).updateVirtualPlayerStats(player);

            expect([BASE_STAT, BONUS_STAT]).toContain(player.speed);
            expect([BASE_STAT, BONUS_STAT]).toContain(player.vitality);
            expect(player.attack.value).toBe(BASE_STAT);
            expect(player.defense.value).toBe(BASE_STAT);
            expect(player.attack.bonusDice).not.toBe(player.defense.bonusDice);
            expect(player.hp.current).toBe(player.vitality);
            expect(player.hp.max).toBe(player.vitality);
        });
    });
});
